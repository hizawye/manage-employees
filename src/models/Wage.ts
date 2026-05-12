import { WageType } from './Employee';
import { AttendanceStatus } from './Attendance';

export interface WageDetail {
  date: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  wageEarned: number;
  adjustment?: number;
  adjustmentNote?: string;
}

export interface MonthlyDayData {
  date: string;
  dayOfMonth: number;
  dayOfWeek: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  wageEarned: number;
  adjustment?: number;
  adjustmentNote?: string;
  hasAttendance: boolean;
}

export interface WageCalculation {
  employeeId: string;
  employeeName: string;
  wageType: WageType;
  wageRate: number;
  period: {
    start: string;
    end: string;
  };
  details: WageDetail[];
  totalWage: number;
  totalDaysPresent: number;
  totalDaysAbsent: number;
  totalHalfDays: number;
  totalHoursWorked?: number;
}
