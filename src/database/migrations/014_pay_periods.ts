import type { Migration } from './index';

function guardLedger(
  table: 'attendance' | 'wage_adjustments',
  event: 'INSERT' | 'UPDATE' | 'DELETE'
) {
  const rows = event === 'UPDATE' ? ['OLD', 'NEW'] : [event === 'DELETE' ? 'OLD' : 'NEW'];
  const checks = rows.map(
    (row) =>
      `EXISTS (SELECT 1 FROM pay_periods WHERE user_id=${row}.user_id AND month=substr(${row}.date,1,7))`
  );
  return `CREATE TRIGGER guard_pay_period_${table}_${event} BEFORE ${event} ON ${table} WHEN ${checks.join(' OR ')}
    BEGIN SELECT RAISE(ABORT,'periods.locked'); END;`;
}

export const payPeriodsMigration: Migration = {
  version: 14,
  name: 'pay_periods',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE pay_periods (
        id TEXT PRIMARY KEY NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        month TEXT NOT NULL, closed_at TEXT NOT NULL, reviewed_exceptions INTEGER NOT NULL,
        UNIQUE(user_id,month)
      );
      CREATE TABLE pay_period_rates (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, month TEXT NOT NULL,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        wage_type TEXT NOT NULL CHECK(wage_type IN('daily','hourly')), wage_rate REAL NOT NULL CHECK(wage_rate>=0),
        PRIMARY KEY(user_id,month,employee_id)
      );
      ${(['attendance', 'wage_adjustments'] as const).flatMap((table) => (['INSERT', 'UPDATE', 'DELETE'] as const).map((event) => guardLedger(table, event))).join('\n')}
      CREATE TRIGGER keep_closed_employee BEFORE DELETE ON employees WHEN EXISTS (
        SELECT 1 FROM pay_periods p JOIN pay_period_rates r ON r.user_id=p.user_id AND r.month=p.month
        WHERE p.user_id=OLD.user_id AND r.employee_id=OLD.id
      ) OR EXISTS (
        SELECT 1 FROM payments x JOIN pay_periods p ON p.user_id=x.user_id AND p.month BETWEEN substr(x.period_start,1,7) AND substr(x.period_end,1,7)
        WHERE x.user_id=OLD.user_id AND x.employee_id=OLD.id
      ) BEGIN SELECT RAISE(ABORT,'periods.locked'); END;
      CREATE TRIGGER audit_period_closed AFTER INSERT ON pay_periods BEGIN
        INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
        VALUES(lower(hex(randomblob(16))),NEW.user_id,'period_closed','period_closed','workforce',NEW.id,
          json_object('date',NEW.month||'-01','exceptions',NEW.reviewed_exceptions),NEW.closed_at);
      END;
      CREATE TRIGGER audit_period_reopened AFTER DELETE ON pay_periods BEGIN
        INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
        VALUES(lower(hex(randomblob(16))),OLD.user_id,'period_reopened','period_reopened','workforce',OLD.id,
          json_object('date',OLD.month||'-01'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
      END;
    `);
  },
};
