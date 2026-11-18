import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { createEmployee } from '../../src/database/repositories/EmployeeRepository';
import { getLogPage } from '../../src/database/repositories/LogRepository';
import { EmployeeStatus, WageType } from '../../src/models';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.requireActual('crypto').randomUUID }));

it('records only committed payroll changes, isolates accounts, and pages through filtered events without repeats', async () => {
  const db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  try {
    for (const migration of migrations.filter(step => step.version <= 8)) await migration.up(db);
    await db.runAsync("INSERT INTO users (id, username, is_guest, created_at) VALUES (91,'owner-a',1,'2026-01-01'), (92,'owner-b',1,'2026-01-01')");
    const employee = await createEmployee(91, { name: 'موظف تجريبي', role: 'Worker', phone: '123',
      wageType: WageType.DAILY, wageRate: 250, status: EmployeeStatus.ACTIVE, joinDate: '2026-01-01' });
    await db.runAsync(`INSERT INTO payments (id,user_id,employee_id,amount,period_start,period_end,payment_date,created_at)
      VALUES ('prior',91,?,75,'2025-12-01','2025-12-31','2025-12-28','2025-12-28')`, [employee.id]);
    await migrations.find(step => step.version === 9)!.up(db);
    expect(await getLogPage(91, 50, 'payroll')).toEqual([]);
    expect(await db.getFirstAsync("SELECT amount FROM payments WHERE id='prior'")).toEqual({ amount: 75 });
    await db.runAsync("INSERT INTO payments (id,user_id,employee_id,amount,period_start,period_end,payment_date,created_at) VALUES ('p1',91,?,50,'2026-01-01','2026-01-31','2026-01-30','2026-01-30')", [employee.id]);
    await db.runAsync("INSERT INTO wage_adjustments (id,user_id,employee_id,amount,date,created_at,updated_at) VALUES ('a1',91,?,-10,'2026-01-01','2026-01-01','2026-01-01')", [employee.id]);
    await db.runAsync("UPDATE wage_adjustments SET amount=5 WHERE id='a1'");
    await db.runAsync("UPDATE wage_adjustments SET amount=5 WHERE id='a1'");
    await db.runAsync("DELETE FROM wage_adjustments WHERE id='a1'");
    await db.execAsync("BEGIN; DELETE FROM payments WHERE id='p1'; ROLLBACK;");
    expect((await getLogPage(91, 50, 'payroll')).map(row => row.action).sort()).toEqual(['create_adjustment','create_payment','delete_adjustment','update_adjustment']);
    await db.runAsync("DELETE FROM payments WHERE id='p1'");
    expect(await getLogPage(92, 20, 'payroll')).toEqual([]);
    // Give all audit events identical timestamps; the ID is the tie-breaker on subsequent pages.
    await db.runAsync("UPDATE logs SET created_at='2026-01-31T18:30:00.000Z' WHERE entity_type='payroll'");
    await db.runAsync("UPDATE logs SET created_at='2026-02-01' WHERE entity_type='employee'");
    const first = await getLogPage(91, 2, 'payroll');
    const second = await getLogPage(91, 2, 'payroll', first[1]);
    const third = await getLogPage(91, 2, 'payroll', second[1]);
    const rows = [...first, ...second, ...third];
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map(r => r.id)).size).toBe(5);
    const update = rows.find(r => r.action === 'update_adjustment')!;
    expect(JSON.parse(update.details!)).toMatchObject({ employeeName: employee.name, previousAmount: -10, amount: 5 });
  } finally { await db.closeAsync(); }
});
