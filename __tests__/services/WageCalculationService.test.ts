import {
  calculateDailyWage,
  calculateHourlyWage,
  calculateWageForDay,
  clearWageCache,
} from '../../src/services/WageCalculationService';
import { AttendanceStatus, WageType, Employee, Attendance } from '../../src/models';

describe('WageCalculationService', () => {
  describe('calculateDailyWage', () => {
    it('should return full wage for PRESENT status', () => {
      expect(calculateDailyWage(1000, AttendanceStatus.PRESENT)).toBe(1000);
      expect(calculateDailyWage(5000, AttendanceStatus.PRESENT)).toBe(5000);
    });

    it('should return half wage for HALF_DAY status', () => {
      expect(calculateDailyWage(1000, AttendanceStatus.HALF_DAY)).toBe(500);
      expect(calculateDailyWage(5000, AttendanceStatus.HALF_DAY)).toBe(2500);
    });

    it('should return 0 for ABSENT status', () => {
      expect(calculateDailyWage(1000, AttendanceStatus.ABSENT)).toBe(0);
      expect(calculateDailyWage(5000, AttendanceStatus.ABSENT)).toBe(0);
    });
  });

  describe('calculateHourlyWage', () => {
    it('should calculate wage correctly based on hours', () => {
      expect(calculateHourlyWage(100, 8)).toBe(800);
      expect(calculateHourlyWage(150, 4)).toBe(600);
      expect(calculateHourlyWage(200, 0)).toBe(0);
    });
  });

  describe('calculateWageForDay', () => {
    const dailyEmployee: Employee = {
      id: '1',
      name: 'Test Employee',
      phone: '1234567890',
      role: 'Worker',
      wageType: WageType.DAILY,
      wageRate: 1000,
      joinDate: '2024-01-01',
      status: 'ACTIVE' as any,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    const hourlyEmployee: Employee = {
      ...dailyEmployee,
      wageType: WageType.HOURLY,
      wageRate: 150,
    };

    it('should calculate daily wage correctly for daily employee', () => {
      const attendance: Attendance = {
        id: '1',
        employeeId: '1',
        date: '2024-01-01',
        status: AttendanceStatus.PRESENT,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(calculateWageForDay(dailyEmployee, attendance)).toBe(1000);
    });

    it('should calculate hourly wage correctly for hourly employee', () => {
      const attendance: Attendance = {
        id: '1',
        employeeId: '1',
        date: '2024-01-01',
        status: AttendanceStatus.PRESENT,
        hoursWorked: 8,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(calculateWageForDay(hourlyEmployee, attendance)).toBe(1200);
    });

    it('should handle hourly employee with no hours worked', () => {
      const attendance: Attendance = {
        id: '1',
        employeeId: '1',
        date: '2024-01-01',
        status: AttendanceStatus.PRESENT,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(calculateWageForDay(hourlyEmployee, attendance)).toBe(0);
    });
  });

  describe('clearWageCache', () => {
    it('should clear cache without throwing error', () => {
      expect(() => clearWageCache()).not.toThrow();
      expect(() => clearWageCache(1, '123')).not.toThrow();
    });
  });
});
