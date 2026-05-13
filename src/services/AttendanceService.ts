import { Attendance, CreateAttendanceInput, AttendanceStatus, WageType } from '../models';
import {
  getAttendanceByDate as dbGetAttendanceByDate,
  getAttendanceByEmployee as dbGetAttendanceByEmployee,
  upsertAttendance as dbUpsertAttendance,
  deleteAttendance as dbDeleteAttendance,
} from '../database/repositories';
import { clearWageCache } from './WageCalculationService';
import { EmployeeService } from './EmployeeService';
import { APP_CONFIG } from '../config/app';

// Cache for attendance records
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const attendanceCache = new Map<string, CacheEntry<Attendance[]>>();

function cleanExpiredCache<T>(cache: Map<string, CacheEntry<T>>): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

export class AttendanceService {
  /**
   * Get attendance records for a specific date
   * Uses cache with 5-minute TTL
   */
  static async getAttendanceByDate(userId: number, date: string, forceRefresh = false): Promise<Attendance[]> {
    cleanExpiredCache(attendanceCache);
    const cacheKey = `${userId}-date-${date}`;
    const now = Date.now();
    const cached = attendanceCache.get(cacheKey);

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await dbGetAttendanceByDate(userId, date);
    attendanceCache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  /**
   * Get attendance records for a specific employee
   * Optionally filter by date range
   */
  static async getAttendanceByEmployee(
    userId: number,
    employeeId: string,
    startDate?: string,
    endDate?: string,
    forceRefresh = false
  ): Promise<Attendance[]> {
    cleanExpiredCache(attendanceCache);
    const cacheKey = `${userId}-employee-${employeeId}-${startDate || 'all'}-${endDate || 'all'}`;
    const now = Date.now();
    const cached = attendanceCache.get(cacheKey);

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const data = await dbGetAttendanceByEmployee(userId, employeeId, startDate, endDate);
    attendanceCache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  /**
   * Mark attendance for an employee
   * Validates input and clears relevant caches
   */
  static async markAttendance(userId: number, input: CreateAttendanceInput): Promise<Attendance> {
    // Validation
    if (!input.employeeId) {
      throw new Error('Employee ID is required');
    }
    if (!input.date) {
      throw new Error('Date is required');
    }
    if (!input.status) {
      throw new Error('Attendance status is required');
    }

    const employee = await EmployeeService.getEmployeeById(userId, input.employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const normalizedInput: CreateAttendanceInput = { ...input };

    if (employee.wageType === WageType.HOURLY) {
      if (normalizedInput.status === AttendanceStatus.ABSENT) {
        normalizedInput.hoursWorked = undefined;
      } else if (normalizedInput.hoursWorked === undefined) {
        normalizedInput.hoursWorked =
          normalizedInput.status === AttendanceStatus.HALF_DAY
            ? APP_CONFIG.attendance.defaultHoursPerDay / 2
            : APP_CONFIG.attendance.defaultHoursPerDay;
      }

      this.validateHoursWorked(normalizedInput.hoursWorked);
    } else if (normalizedInput.status === AttendanceStatus.ABSENT) {
      normalizedInput.hoursWorked = undefined;
    }

    const result = await dbUpsertAttendance(userId, normalizedInput);

    // Clear caches after mutation
    this.clearCache(userId, normalizedInput.employeeId, normalizedInput.date);

    // Clear wage calculation cache for this employee
    clearWageCache(userId, normalizedInput.employeeId);

    return result;
  }

  private static validateHoursWorked(hoursWorked: number | undefined): void {
    if (hoursWorked === undefined) {
      throw new Error('Hours worked is required');
    }
    if (hoursWorked <= APP_CONFIG.attendance.minHoursPerDay) {
      throw new Error('Hours worked must be greater than 0');
    }
    if (hoursWorked > APP_CONFIG.attendance.maxHoursPerDay) {
      throw new Error('Hours worked cannot exceed 24 hours');
    }
  }

  /**
   * Delete an attendance record
   * Clears relevant caches
   */
  static async deleteAttendance(userId: number, id: string, employeeId?: string): Promise<void> {
    await dbDeleteAttendance(userId, id);

    // Clear attendance caches for this user
    this.clearCache(userId);

    // Clear wage cache if we know the employee
    if (employeeId) {
      clearWageCache(userId, employeeId);
    } else {
      clearWageCache(); // Clear all wage caches
    }
  }

  /**
   * Clear cache for specific date/employee or all attendance
   */
  static clearCache(userId: number, employeeId?: string, date?: string): void {
    if (date) {
      attendanceCache.delete(`${userId}-date-${date}`);
    }
    if (employeeId) {
      // Clear all caches for this user-employee combination
      for (const key of attendanceCache.keys()) {
        if (key.startsWith(`${userId}-employee-${employeeId}-`)) {
          attendanceCache.delete(key);
        }
      }
    }
    if (!employeeId && !date) {
      // Clear all caches for this user
      for (const key of attendanceCache.keys()) {
        if (key.startsWith(`${userId}-`)) {
          attendanceCache.delete(key);
        }
      }
    }
  }

  /**
   * Get attendance statistics for an employee
   */
  static async getAttendanceStats(
    userId: number,
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    attendanceRate: number;
  }> {
    const records = await this.getAttendanceByEmployee(userId, employeeId, startDate, endDate);

    const stats = {
      totalDays: records.length,
      presentDays: 0,
      absentDays: 0,
      halfDays: 0,
      attendanceRate: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          stats.presentDays++;
          break;
        case AttendanceStatus.ABSENT:
          stats.absentDays++;
          break;
        case AttendanceStatus.HALF_DAY:
          stats.halfDays++;
          break;
      }
    }

    if (stats.totalDays > 0) {
      stats.attendanceRate = ((stats.presentDays + stats.halfDays * 0.5) / stats.totalDays) * 100;
    }

    return stats;
  }
}
