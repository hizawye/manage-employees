import { Employee, Attendance, AttendanceStatus, WageType, WageCalculation, WageDetail } from '../models';
import { getAttendanceByEmployee } from '../database/repositories';

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
  employee: Employee,
  startDate: string,
  endDate: string
): Promise<WageCalculation> {
  const attendanceRecords = await getAttendanceByEmployee(employee.id, startDate, endDate);

  const details: WageDetail[] = [];
  let totalWage = 0;
  let totalDaysPresent = 0;
  let totalDaysAbsent = 0;
  let totalHalfDays = 0;
  let totalHoursWorked = 0;

  for (const record of attendanceRecords) {
    const wageEarned = calculateWageForDay(employee, record);

    details.push({
      date: record.date,
      status: record.status,
      hoursWorked: record.hoursWorked,
      wageEarned,
    });

    totalWage += wageEarned;

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
  }

  return {
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
}

export async function calculateWagesForAllEmployees(
  employees: Employee[],
  startDate: string,
  endDate: string
): Promise<WageCalculation[]> {
  const calculations = await Promise.all(
    employees.map((emp) => calculateWagesForPeriod(emp, startDate, endDate))
  );
  return calculations;
}

export function getTotalWages(calculations: WageCalculation[]): number {
  return calculations.reduce((sum, calc) => sum + calc.totalWage, 0);
}
