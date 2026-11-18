import type { Migration } from './index';

function guardShifts(event: 'INSERT' | 'UPDATE') {
  return `
    CREATE TRIGGER guard_work_shift_${event} BEFORE ${event} ON work_shifts BEGIN
      SELECT RAISE(ABORT, 'schedule.inactive') WHERE NOT EXISTS (
        SELECT 1 FROM employees WHERE id=NEW.employee_id AND user_id=NEW.user_id AND status='active'
      );
      SELECT RAISE(ABORT, 'schedule.overlap') WHERE EXISTS (
        SELECT 1 FROM work_shifts WHERE user_id=NEW.user_id AND employee_id=NEW.employee_id
          AND id<>NEW.id AND start_at<NEW.end_at AND end_at>NEW.start_at
      );
      SELECT RAISE(ABORT, 'schedule.onLeave') WHERE EXISTS (
        SELECT 1 FROM work_shift_unavailability WHERE user_id=NEW.user_id AND employee_id=NEW.employee_id
          AND start_at<NEW.end_at AND end_at>NEW.start_at
      );
    END;
  `;
}

function auditShift(event: 'INSERT' | 'UPDATE' | 'DELETE', action: string) {
  const row = event === 'DELETE' ? 'OLD' : 'NEW';
  return `
    CREATE TRIGGER audit_${action} AFTER ${event} ON work_shifts BEGIN
      INSERT INTO logs (id,user_id,action,description,entity_type,entity_id,details,created_at)
      SELECT lower(hex(randomblob(16))),${row}.user_id,'${action}','${action}','workforce',${row}.id,
        json_object('employeeName',name,'date',substr(${row}.start_at,1,10)),
        strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM employees
        WHERE id=${row}.employee_id AND user_id=${row}.user_id;
    END;
  `;
}

export const workShiftsMigration: Migration = {
  version: 10,
  name: 'work_shifts',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE work_shifts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        start_at TEXT NOT NULL, end_at TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
        copied_from TEXT, copied_week TEXT,
        CHECK (strftime('%Y-%m-%dT%H:%M',start_at,'+0 minutes') IS start_at),
        CHECK (strftime('%Y-%m-%dT%H:%M',end_at,'+0 minutes') IS end_at),
        CHECK (end_at>start_at AND end_at<strftime('%Y-%m-%dT%H:%M',start_at,'+1 day')),
        CHECK ((copied_from IS NULL) = (copied_week IS NULL)),
        UNIQUE (user_id,copied_from,copied_week)
      );
      CREATE INDEX shift_week ON work_shifts(user_id,start_at);
      CREATE INDEX shift_employee ON work_shifts(user_id,employee_id,start_at,end_at);
      -- The leave migration replaces this empty calendar with approved time off.
      CREATE VIEW work_shift_unavailability(user_id,employee_id,start_at,end_at) AS
        SELECT NULL,NULL,NULL,NULL WHERE 0;
      ${guardShifts('INSERT')}
      ${guardShifts('UPDATE')}
      ${auditShift('INSERT', 'shift_created')}
      ${auditShift('UPDATE', 'shift_updated')}
      ${auditShift('DELETE', 'shift_deleted')}
    `);
  },
};
