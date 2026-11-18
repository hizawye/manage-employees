import { getDatabase } from '../../src/database';
import { migrations, runMigrations } from '../../src/database/migrations';
import { getEmployeeById } from '../../src/database/repositories/EmployeeRepository';
import { getWorkOverview } from '../../src/workforce/overview';
import { loadReport } from '../../src/workforce/reports';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../../src/i18n', () => ({ t: (key: string) => key }));
it('upgrades the installed v9 workspace twice without changing prior staff, wages or payments', async () => {
  const db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  const logger = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    await db.execAsync(
      'CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,applied_at TEXT NOT NULL);'
    );
    for (const m of migrations.filter((m) => m.version <= 9)) {
      await m.up(db);
      await db.runAsync('INSERT INTO schema_migrations VALUES(?,?,?)', [
        m.version,
        m.name,
        '2026-01-01',
      ]);
    }
    await db.execAsync(`INSERT INTO users(id,username,is_guest,created_at) VALUES(41,'old_guest',1,'');
      INSERT INTO employees(id,user_id,name,phone,role,wage_type,wage_rate,join_date,status,created_at,updated_at) VALUES('existing',41,'Fixture','01','Desk','daily',100,'2026-01-01','inactive','','');
      INSERT INTO attendance(id,employee_id,user_id,date,status,created_at,updated_at) VALUES('attendance','existing',41,'2026-01-20','half_day','','');
      INSERT INTO payments(id,user_id,employee_id,amount,period_start,period_end,payment_date,created_at) VALUES('payment',41,'existing',20,'2026-01-01','2026-01-31','2026-01-21','');`);
    await runMigrations(db);
    await runMigrations(db);
    expect(
      await db.getFirstAsync(
        'SELECT max(version) AS version FROM schema_migrations'
      )
    ).toEqual({ version: 16 });
    expect(await getEmployeeById(41, 'existing')).toMatchObject({
      name: 'Fixture',
      status: 'inactive',
    });
    expect(
      (await loadReport(41, 'payroll', '2026-01-01', '2026-01-31')).rows
    ).toEqual([['Fixture', 'Desk', 0, 1, 0, '', 0, 50, 20]]);
    expect(await getWorkOverview(41, '2026-01-20', '2026-01-20T12:00')).toEqual(
      { shifts: 0, pending: 0, clocked: 0, unchecked: 0 }
    );
  } finally {
    logger.mockRestore();
    await db.closeAsync();
  }
});
