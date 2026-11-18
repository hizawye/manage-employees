import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
} from '../../src/database/repositories/EmployeeRepository';
import { Employee, WageType, EmployeeStatus, AttendanceStatus } from '../../src/models';
import {
  clockIn,
  clockOut,
  getClockDays,
  postClockAttendance,
} from '../../src/services/TimeClockService';
import { AttendanceService } from '../../src/services/AttendanceService';
import { WageAdjustmentService } from '../../src/services/WageAdjustmentService';
import { EmployeeService } from '../../src/services/EmployeeService';
import { PaymentService } from '../../src/services/PaymentService';
import { calculateWagesForPeriod } from '../../src/services/WageCalculationService';
import {
  closePayPeriod,
  getPayPeriodReview,
  reopenPayPeriod,
} from '../../src/services/PayPeriodService';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('../../src/i18n', () => ({ t: (key: string) => key }));

const month = '2025-05';
const date = month + '-19';
const owner = 31;
let db: SQLiteDatabase;
let employee: Employee;
const review = () => getPayPeriodReview(owner, month);
beforeEach(async () => {
  db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  for (const m of migrations) await m.up(db);
  await db.execAsync(
    "INSERT INTO users(id,username,created_at) VALUES(31,'budget','2020-01-01'),(32,'other_workspace','2020-01-01')"
  );
  employee = await createEmployee(owner, {
    name: 'Zahra',
    wageType: WageType.HOURLY,
    wageRate: 100,
    role: 'Technician',
    phone: '101',
    status: EmployeeStatus.ACTIVE,
    joinDate: '2020-01-01',
  });
});
afterEach(async () => {
  await db.closeAsync();
});
it('locks all attendance and adjustment mutations, preserves frozen pay on a later pay-type change and accepts payments', async () => {
  const mark = (hours: number) =>
    AttendanceService.markAttendance(owner, {
      employeeId: employee.id,
      date,
      status: AttendanceStatus.PRESENT,
      hoursWorked: hours,
    });
  const adjust = (amount: number) =>
    WageAdjustmentService.saveAdjustment(owner, {
      employeeId: employee.id,
      userId: owner,
      date,
      amount,
    });
  await mark(4);
  await adjust(25);
  const seen = await review();
  expect(seen.employees[0].earned).toBe(425);
  await closePayPeriod(owner, seen);
  await closePayPeriod(owner, seen);
  await expect(mark(3)).rejects.toThrow('periods.locked');
  await expect(adjust(1)).rejects.toThrow('periods.locked');
  await expect(
    db.runAsync('DELETE FROM attendance WHERE employee_id=?', [employee.id])
  ).rejects.toThrow('periods.locked');
  await expect(
    db.runAsync('DELETE FROM wage_adjustments WHERE employee_id=?', [employee.id])
  ).rejects.toThrow('periods.locked');
  await expect(
    db.runAsync('UPDATE attendance SET date=? WHERE employee_id=?', ['2025-06-01', employee.id])
  ).rejects.toThrow('periods.locked');
  await expect(deleteEmployee(owner, employee.id)).rejects.toThrow('periods.locked');
  await EmployeeService.updateEmployee(owner, employee.id, {
    wageType: WageType.DAILY,
    wageRate: 800,
  });
  const updated = (await getEmployeeById(owner, employee.id))!;
  expect(await calculateWagesForPeriod(owner, updated, '2025-05-01', '2025-05-31')).toMatchObject({
    totalWage: 425,
    wageType: WageType.HOURLY,
    wageRate: 100,
    totalHoursWorked: 4,
  });
  await PaymentService.recordPayment(owner, {
    userId: owner,
    employeeId: employee.id,
    periodStart: '2025-05-01',
    periodEnd: '2025-05-31',
    paymentDate: '2025-06-01',
    amount: 425,
  });
  const closure = (await review()).period!;
  await reopenPayPeriod(owner, month, closure.id);
  await reopenPayPeriod(owner, month, closure.id);
  await mark(5);
  await adjust(5);
  expect((await calculateWagesForPeriod(owner, updated, date, date)).totalWage).toBe(505);
  await closePayPeriod(owner, await review());
  await expect(reopenPayPeriod(owner, month, closure.id)).rejects.toThrow('periods.changed');
  expect(
    await db.getFirstAsync(
      "SELECT COUNT(*) AS n FROM logs WHERE action='period_closed' AND user_id=?",
      [owner]
    )
  ).toEqual({ n: 2 });
});
it('requires resolving open punches, explicit review of missed attendance and fresh preview for changed hours', async () => {
  await db.runAsync(
    `INSERT INTO work_shifts(id,user_id,employee_id,start_at,end_at,role,location,notes) VALUES ('shift',?,?,?,?,?,?,?)`,
    [owner, employee.id, date + 'T09:00', date + 'T10:00', 'test', '', '']
  );
  let seen = await review();
  expect(seen.issues[0]).toMatchObject({ reason: 'missing', date });
  await expect(closePayPeriod(owner, seen)).rejects.toThrow('periods.reviewFirst');
  await clockIn(owner, employee.id, 'night', new Date(date + 'T22:00:00').getTime());
  seen = await review();
  expect(seen.issues.some((i) => i.reason === 'openPunch')).toBe(true);
  await expect(closePayPeriod(owner, seen, true)).rejects.toThrow('periods.unfinished');
  await clockOut(owner, 'night', new Date('2025-05-20T01:00:00').getTime());
  const unmatched = await review();
  expect(unmatched.issues.map((i) => i.reason)).toEqual(['unposted', 'unposted']);
  const day = (await getClockDays(owner, date))[0];
  await postClockAttendance(owner, day, AttendanceStatus.PRESENT);
  await expect(closePayPeriod(owner, unmatched, true)).rejects.toThrow('periods.changed');
  seen = await review();
  expect(seen.issues).toHaveLength(1);
  await closePayPeriod(owner, seen, true);
  expect((await review()).period?.reviewed_exceptions).toBe(1);
});
it('rejects future periods and preserves workspace separation', async () => {
  const future = await getPayPeriodReview(owner, '9998-09');
  await expect(closePayPeriod(owner, future)).rejects.toThrow('periods.future');
  await expect(closePayPeriod(32, await review())).rejects.toThrow('periods.changed');
  await closePayPeriod(owner, await review());
  expect((await getPayPeriodReview(32, month)).period).toBeNull();
  const other = await createEmployee(32, {
    name: 'Other',
    wageType: WageType.DAILY,
    wageRate: 15,
    phone: '22',
    role: 'Clerk',
    status: EmployeeStatus.ACTIVE,
    joinDate: '2020-01-01',
  });
  await AttendanceService.markAttendance(32, {
    employeeId: other.id,
    date,
    status: AttendanceStatus.PRESENT,
  });
  expect((await getPayPeriodReview(32, month)).employees[0].earned).toBe(15);
});

it('keeps a daily-rate worker on daily attendance after reopening even when their current pay is hourly', async () => {
  await EmployeeService.updateEmployee(owner, employee.id, {
    wageType: WageType.DAILY,
    wageRate: 300,
  });
  await AttendanceService.markAttendance(owner, {
    employeeId: employee.id,
    date,
    status: AttendanceStatus.HALF_DAY,
  });
  await closePayPeriod(owner, await review());
  const closure = (await review()).period!;
  await EmployeeService.updateEmployee(owner, employee.id, {
    wageType: WageType.HOURLY,
    wageRate: 65,
  });
  const current = (await EmployeeService.getEmployeeById(owner, employee.id, true))!;
  expect(current.wageType).toBe(WageType.HOURLY);
  await reopenPayPeriod(owner, month, closure.id);
  const historical = await AttendanceService.markAttendance(owner, {
    employeeId: employee.id,
    date,
    status: AttendanceStatus.PRESENT,
    hoursWorked: 8,
  });
  expect(historical.hoursWorked).toBeUndefined();
  expect((await getClockDays(owner, date))[0].wageType).toBe(WageType.DAILY);
  await AttendanceService.markAttendance(owner, {
    employeeId: employee.id,
    date: '2025-06-01',
    status: AttendanceStatus.PRESENT,
    hoursWorked: 2,
  });
  const wages = await calculateWagesForPeriod(owner, current, date, '2025-06-01');
  expect(wages.totalWage).toBe(430);
  expect(wages.totalHoursWorked).toBe(2);
});
