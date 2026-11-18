import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../src/database';
import { runMigrations } from '../../src/database/migrations';
import { createEmployee } from '../../src/database/repositories';
import { Employee, EmployeeStatus, WageType } from '../../src/models';
import { WageAdjustmentService } from '../../src/services/WageAdjustmentService';
import { calculateWagesForPeriod, clearWageCache, getMonthlyDayData } from '../../src/services/WageCalculationService';
import { getPaymentHistoryBalance, PaymentService } from '../../src/services/PaymentService';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('node:crypto').randomUUID() }));

describe('payroll ledger with SQLite', () => {
  let db: SQLiteDatabase;
  let employee: Employee;
  const owner = 10;
  const otherUser = 11;
  const periodStart = '2025-10-31';
  const periodEnd = '2025-11-03';
  const paymentInput = (amount: number) => ({
    userId: owner, employeeId: employee.id, periodStart, periodEnd, paymentDate: periodEnd, amount,
  });
  const saveAdjustment = (amount: number, note?: string) => WageAdjustmentService.saveAdjustment(owner, {
    userId: owner, employeeId: employee.id, date: periodEnd, amount, note,
  });

  beforeEach(async () => {
    clearWageCache();
    db = openTestDatabase();
    jest.mocked(getDatabase).mockResolvedValue(db);
    await runMigrations(db);
    await db.execAsync(`INSERT INTO users(id, username, created_at)
      VALUES (10, 'owner', '2025-01-01'), (11, 'other', '2025-01-01')`);
    employee = await createEmployee(owner, {
      name: 'Worker', phone: '123', role: 'Operator', wageType: WageType.HOURLY,
      wageRate: 2.01, joinDate: '2025-01-01', status: EmployeeStatus.ACTIVE,
    });
  });
  afterEach(async () => { await db.closeAsync(); });

  it('includes both endpoints across DST, counts recorded absences, and reconciles day totals after edits', async () => {
    await db.runAsync(`INSERT INTO attendance(id, user_id, employee_id, date, status, hours_worked, created_at, updated_at)
      VALUES ('worked', ?, ?, ?, 'present', 0.5, '', ''), ('absent', ?, ?, '2025-11-02', 'absent', 8, '', '')`,
      [owner, employee.id, periodStart, owner, employee.id]);
    const read = () => calculateWagesForPeriod(owner, employee, periodStart, periodEnd);

    const initial = await read();
    expect(initial.totalWage).toBe(1.01);
    expect(initial.totalHoursWorked).toBe(0.5);
    expect(initial.totalDaysAbsent).toBe(1);
    expect(initial.details.map(day => day.date)).toEqual([periodStart, '2025-11-01', '2025-11-02', periodEnd]);
    expect(getMonthlyDayData(initial).map(day => [day.dayOfMonth, day.dayOfWeek, day.hasAttendance]))
      .toEqual([[31, 'Fri', true], [1, 'Sat', false], [2, 'Sun', true], [3, 'Mon', false]]);

    const original = await saveAdjustment(0.20, 'Bonus');
    const bonus = await read();
    expect(bonus.details[3]).toMatchObject({ wageEarned: 0.20, adjustment: 0.20, hasAttendance: false });
    expect(bonus.totalWage).toBe(1.21);

    const edited = await saveAdjustment(-0.01, 'Correction');
    expect(edited.id).toBe(original.id);
    const corrected = await read();
    expect(corrected.totalWage).toBe(1);
    expect(corrected.details[3]).toMatchObject({ wageEarned: -0.01, adjustmentNote: 'Correction' });
  });

  it('serializes overlapping first saves to one persisted adjustment per employee and day', async () => {
    const saves = await Promise.all([saveAdjustment(10), saveAdjustment(20)]);
    expect(saves[0].id).toBe(saves[1].id);
    const rows = await WageAdjustmentService.getAdjustmentsByEmployee(owner, employee.id, periodStart, periodEnd);
    expect(rows).toHaveLength(1);
    expect([10, 20]).toContain(rows[0].amount);
    expect(saves.map(save => save.amount)).toEqual([10, 20]);
  });

  it('settles split payments to the centime and flags only the payment that caused the excess', async () => {
    const first = await PaymentService.recordPayment(owner, paymentInput(0.1));
    const second = await PaymentService.recordPayment(owner, paymentInput(0.2));
    const balance = () => PaymentService.isFullyPaid(owner, employee.id, periodStart, periodEnd, 0.3);
    const history = () => PaymentService.getEmployeePayments(owner, employee.id, periodStart, periodEnd);
    expect(await balance()).toMatchObject({ paid: 0.3, remaining: 0, isFullyPaid: true, isOverpaid: false });
    expect(getPaymentHistoryBalance(0.3, await history()).overpaidPaymentIds.size).toBe(0);

    const extra = await PaymentService.recordPayment(owner, paymentInput(0.01));
    expect((await history()).map(payment => payment.id)).toEqual([extra.id, second.id, first.id]);
    expect(getPaymentHistoryBalance(0.3, await history()).overpaidPaymentIds).toEqual(new Set([extra.id]));
    expect(await balance()).toMatchObject({ remaining: -0.01, overpaidAmount: 0.01 });
    await PaymentService.deletePayment(owner, extra.id);
    expect(await balance()).toMatchObject({ remaining: 0, isOverpaid: false });
    expect(await PaymentService.getPaidAmount(owner, employee.id, '2025-10-01', '2025-10-31')).toBe(0);
  });

  it('refuses nonfinite amounts, fractional centimes, impossible dates and cross-account writes', async () => {
    for (const amount of [NaN, Infinity, -Infinity, 0.001]) {
      await expect(PaymentService.recordPayment(owner, paymentInput(amount))).rejects.toThrow();
      await expect(saveAdjustment(amount)).rejects.toThrow();
    }
    await expect(PaymentService.recordPayment(owner, paymentInput(0))).rejects.toThrow();
    await expect(PaymentService.recordPayment(owner, { ...paymentInput(10), paymentDate: '2025-02-29' })).rejects.toThrow();
    await expect(PaymentService.recordPayment(otherUser, paymentInput(10))).rejects.toThrow('Employee not found');
    await expect(WageAdjustmentService.saveAdjustment(otherUser, {
      employeeId: employee.id, userId: owner, amount: 1, date: periodEnd,
    })).rejects.toThrow('Employee not found');
    expect(await PaymentService.getEmployeePayments(owner, employee.id)).toEqual([]);
    const paid = await PaymentService.recordPayment(owner, paymentInput(5));
    await expect(PaymentService.deletePayment(otherUser, paid.id)).rejects.toThrow('Payment not found');
    expect(await PaymentService.getPaidAmount(otherUser, employee.id, periodStart, periodEnd)).toBe(0);
    expect(await PaymentService.getPaidAmount(owner, employee.id, periodStart, periodEnd)).toBe(5);
  });
});
