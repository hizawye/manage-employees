export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateAttendanceInput = Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAttendanceInput = Partial<Omit<Attendance, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>>;
