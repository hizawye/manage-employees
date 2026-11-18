import { Employee, Attendance, AttendanceStatus, WageType, WageCalculation, WageDetail, MonthlyDayData } from '../models';
import { getAttendanceByEmployee, getWageAdjustmentsByEmployee } from '../database/repositories';
import { toCentimes } from '../utils/money';
import { isPayrollDate } from '../utils/payrollDate';

// Cache for wage calculations
const wageCalculationCache = new Map<string, { result: Promise<WageCalculation>; timestamp: number }>();
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
export function clearWageCache(userId?: number, employeeId?: string) {
  if (userId && employeeId) {
    for (const key of wageCalculationCache.keys()) {
      if (key.startsWith(`${userId}-${employeeId}-`)) {
        wageCalculationCache.delete(key);
      }
    }
  } else if (employeeId) {
    // Clear all cache entries for this employee
    for (const key of wageCalculationCache.keys()) {
      if (key.includes(`-${employeeId}-`)) {
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
  if (attendance.status === AttendanceStatus.ABSENT) {
    return 0;
  }

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
  const cacheKey = `${userId}-${employee.id}-${JSON.stringify([startDate, endDate, employee.name, employee.wageType, employee.wageRate])}`;
  const cached = wageCalculationCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.result;
  }

  if (!isPayrollDate(startDate) || !isPayrollDate(endDate) || startDate > endDate) {
    throw new Error('Invalid payroll period');
  }

  // Publish the pending read before awaiting SQLite. A write that clears the
  // cache while this read is in flight must also invalidate the pending result.
  const result = readWagesForPeriod(userId, employee, startDate, endDate);
  wageCalculationCache.set(cacheKey, { result, timestamp: now });
  try {
    return await result;
  } catch (error) {
    if (wageCalculationCache.get(cacheKey)?.result === result) wageCalculationCache.delete(cacheKey);
    throw error;
  }
}

async function readWagesForPeriod(
  userId: number, employee: Employee, startDate: string, endDate: string
): Promise<WageCalculation> {
  const [attendanceRecords, adjustments] = await Promise.all([
    getAttendanceByEmployee(userId, employee.id, startDate, endDate),
    getWageAdjustmentsByEmployee(userId, employee.id, startDate, endDate),
  ]);

  const attendanceMap = new Map(attendanceRecords.map((record) => [record.date, record]));
  const adjustmentMap = new Map(adjustments.map((adjustment) => [adjustment.date, adjustment]));
  const details: WageDetail[] = [];
  let totalCentimes = 0;
  let totalDaysPresent = 0;
  let totalDaysAbsent = 0;
  let totalHalfDays = 0;
  let totalHoursWorked = 0;

  // These are calendar dates. Use UTC for the entire iteration, including DST boundaries.
  const end = new Date(endDate);
  for (const day = new Date(startDate); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    const record = attendanceMap.get(date);
    const adjustment = adjustmentMap.get(date);
    const earned = record ? toCentimes(calculateWageForDay(employee, record)) : 0;
    const dayCentimes = earned + toCentimes(adjustment?.amount ?? 0);
    const hoursWorked = record?.status === AttendanceStatus.ABSENT ? undefined : record?.hoursWorked;
    details.push({
      date,
      hasAttendance: !!record,
      status: record?.status ?? AttendanceStatus.ABSENT,
      hoursWorked,
      wageEarned: dayCentimes / 100,
      adjustment: adjustment?.amount,
      adjustmentNote: adjustment?.note,
    });
    totalCentimes += dayCentimes;
    totalHoursWorked += hoursWorked ?? 0;
    switch (record?.status) {
      case AttendanceStatus.PRESENT: totalDaysPresent++; break;
      case AttendanceStatus.HALF_DAY: totalHalfDays++; break;
      case AttendanceStatus.ABSENT: totalDaysAbsent++; break;
    }
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    wageType: employee.wageType,
    wageRate: employee.wageRate,
    period: { start: startDate, end: endDate },
    details,
    totalWage: totalCentimes / 100,
    totalDaysPresent,
    totalDaysAbsent,
    totalHalfDays,
    totalHoursWorked: employee.wageType === WageType.HOURLY ? totalHoursWorked : undefined,
  };

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
  return calculations.reduce((sum, calc) => sum + toCentimes(calc.totalWage), 0) / 100;
}

export function getMonthlyDayData(calc: WageCalculation): MonthlyDayData[] {
  return calc.details.map((d) => ({
    ...d,
    dayOfMonth: new Date(d.date).getUTCDate(),
    dayOfWeek: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  }));
}
