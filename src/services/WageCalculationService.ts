import { Employee, Attendance, AttendanceStatus, WageType, WageCalculation, WageDetail, MonthlyDayData } from '../models';
import { getAttendanceByEmployee } from '../database/repositories';

// Cache for wage calculations
const wageCalculationCache = new Map<string, { result: WageCalculation; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanExpiredWageCache(): void {
  const now = Date.now();
  for (const [key, entry] of wageCalculationCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      wageCalculationCache.delete(key);
    }
  }
}

// Function to clear cache for specific employee (call when attendance changes)
export function clearWageCache(employeeId?: string) {
  if (employeeId) {
    // Clear all cache entries for this employee
    for (const key of wageCalculationCache.keys()) {
      if (key.startsWith(`${employeeId}-`)) {
        wageCalculationCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    wageCalculationCache.clear();
  }
}

export function calculateDailyWage(wageRate: number, status: AttendanceStatus): number {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return wageRate;
    case AttendanceStatus.HALF_DAY:
      return wageRate * 0.5;
    case AttendanceStatus.ABSENT:
      return 0;
    default:
      return 0;
  }
}

export function calculateHourlyWage(hourlyRate: number, hoursWorked: number): number {
  return hourlyRate * hoursWorked;
}

export function calculateWageForDay(
  employee: Employee,
  attendance: Attendance
): number {
  if (employee.wageType === WageType.DAILY) {
    return calculateDailyWage(employee.wageRate, attendance.status);
  } else {
    return calculateHourlyWage(employee.wageRate, attendance.hoursWorked || 0);
  }
}

export async function calculateWagesForPeriod(
  userId: number,
  employee: Employee,
  startDate: string,
  endDate: string
): Promise<WageCalculation> {
  cleanExpiredWageCache();
  // Check cache first
  const cacheKey = `${employee.id}-${startDate}-${endDate}`;
  const cached = wageCalculationCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.result;
  }

  const attendanceRecords = await getAttendanceByEmployee(userId, employee.id, startDate, endDate);

  // Build a map of date -> attendance record for quick lookup
  const attendanceMap = new Map<string, Attendance>();
  for (const record of attendanceRecords) {
    attendanceMap.set(record.date, record);
  }

  // Generate ALL days in the period (including days with no attendance)
  const details: WageDetail[] = [];
  let totalWage = 0;
  let totalDaysPresent = 0;
  let totalDaysAbsent = 0;
  let totalHalfDays = 0;
  let totalHoursWorked = 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = toISODate(d);
    const record = attendanceMap.get(dateStr);

    let wageEarned: number;
    let status: AttendanceStatus;
    let hoursWorked: number | undefined;

    if (record) {
      wageEarned = calculateWageForDay(employee, record);
      status = record.status;
      hoursWorked = record.hoursWorked;
    } else {
      // No attendance record for this day - not worked
      wageEarned = 0;
      status = AttendanceStatus.ABSENT;
      hoursWorked = undefined;
    }

    const detail: WageDetail = {
      date: dateStr,
      status,
      hoursWorked,
      wageEarned,
    };

    details.push(detail);
    totalWage += wageEarned;

    if (record) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          totalDaysPresent++;
          break;
        case AttendanceStatus.ABSENT:
          totalDaysAbsent++;
          break;
        case AttendanceStatus.HALF_DAY:
          totalHalfDays++;
          break;
      }

      if (record.hoursWorked) {
        totalHoursWorked += record.hoursWorked;
      }
    } else {
      totalDaysAbsent++;
    }
  }

  const result: WageCalculation = {
    employeeId: employee.id,
    employeeName: employee.name,
    wageType: employee.wageType,
    wageRate: employee.wageRate,
    period: { start: startDate, end: endDate },
    details,
    totalWage,
    totalDaysPresent,
    totalDaysAbsent,
    totalHalfDays,
    totalHoursWorked: employee.wageType === WageType.HOURLY ? totalHoursWorked : undefined,
  };

  // Cache the result
  wageCalculationCache.set(cacheKey, { result, timestamp: now });

  return result;
}

export async function calculateWagesForAllEmployees(
  userId: number,
  employees: Employee[],
  startDate: string,
  endDate: string
): Promise<WageCalculation[]> {
  const calculations = await Promise.all(
    employees.map((emp) => calculateWagesForPeriod(userId, emp, startDate, endDate))
  );
  return calculations;
}

export function getTotalWages(calculations: WageCalculation[]): number {
  return calculations.reduce((sum, calc) => sum + calc.totalWage, 0);
}

export function getMonthlyDayData(calc: WageCalculation): MonthlyDayData[] {
  return calc.details.map((d) => ({
    ...d,
    dayOfMonth: new Date(d.date).getDate(),
    dayOfWeek: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
    hasAttendance: d.status !== AttendanceStatus.ABSENT || d.hoursWorked !== undefined,
  }));
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}