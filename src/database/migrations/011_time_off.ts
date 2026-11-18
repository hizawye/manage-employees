import type { Migration } from './index';

function validDate(column: 'start_date' | 'end_date') {
  return `${column} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(${column}, '+0 days') IS ${column}`;
}

function audit(event: 'INSERT' | 'UPDATE') {
  const action =
    "CASE NEW.status WHEN 'pending' THEN 'leave_requested' WHEN 'approved' THEN 'leave_approved' WHEN 'declined' THEN 'leave_declined' ELSE 'leave_cancelled' END";
  return `
    CREATE TRIGGER audit_time_off_${event} AFTER ${event} ON time_off_requests
    BEGIN
      INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
      SELECT lower(hex(randomblob(16))),NEW.user_id,${action},${action},'workforce',NEW.id,
        json_object('employeeName',name,'date',NEW.start_date,'endDate',NEW.end_date,'status',NEW.status),
        NEW.updated_at FROM employees WHERE id=NEW.employee_id AND user_id=NEW.user_id;
    END;`;
}

export const timeOffMigration: Migration = {
  version: 11,
  name: 'time_off',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE time_off_requests (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        start_date TEXT NOT NULL CHECK(${validDate('start_date')}),
        end_date TEXT NOT NULL CHECK(${validDate('end_date')} AND end_date >= start_date),
        type TEXT NOT NULL CHECK(type IN ('vacation','sick','personal','other')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined','cancelled')),
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX leave_by_status ON time_off_requests(user_id,status,start_date);
      CREATE INDEX leave_by_employee ON time_off_requests(user_id,employee_id,status,start_date,end_date);
      CREATE UNIQUE INDEX leave_pending_request ON time_off_requests(user_id,employee_id,start_date,end_date,type)
        WHERE status='pending';

      DROP VIEW work_shift_unavailability;
      CREATE VIEW work_shift_unavailability(user_id,employee_id,start_at,end_at) AS
        SELECT user_id,employee_id,start_date || 'T00:00',
          COALESCE(date(end_date,'+1 day') || 'T00:00','9999-12-31T24:00')
        FROM time_off_requests WHERE status='approved';

      CREATE TRIGGER guard_time_off_insert BEFORE INSERT ON time_off_requests
      BEGIN
        SELECT RAISE(ABORT,'leave.unavailableEmployee') WHERE NOT EXISTS
          (SELECT 1 FROM employees WHERE id=NEW.employee_id AND user_id=NEW.user_id AND status='active');
        SELECT RAISE(ABORT,'leave.changed') WHERE NEW.status <> 'pending';
      END;

      CREATE TRIGGER guard_time_off_update BEFORE UPDATE ON time_off_requests
      BEGIN
        SELECT RAISE(ABORT,'leave.changed') WHERE OLD.id<>NEW.id OR OLD.user_id<>NEW.user_id OR
          OLD.employee_id<>NEW.employee_id OR OLD.start_date<>NEW.start_date OR OLD.end_date<>NEW.end_date OR
          OLD.type<>NEW.type OR OLD.note<>NEW.note OR OLD.created_at<>NEW.created_at OR NOT
          ((OLD.status='pending' AND NEW.status IN ('approved','declined','cancelled')) OR
           (OLD.status='approved' AND NEW.status='cancelled'));
        SELECT RAISE(ABORT,'leave.unavailableEmployee') WHERE NEW.status='approved' AND NOT EXISTS
          (SELECT 1 FROM employees WHERE id=NEW.employee_id AND user_id=NEW.user_id AND status='active');
        SELECT RAISE(ABORT,'leave.leaveConflict') WHERE NEW.status='approved' AND EXISTS (
          SELECT 1 FROM time_off_requests WHERE user_id=NEW.user_id AND employee_id=NEW.employee_id
          AND status='approved' AND start_date<=NEW.end_date AND end_date>=NEW.start_date
        );
        SELECT RAISE(ABORT,'leave.shiftConflict') WHERE NEW.status='approved' AND EXISTS (
          SELECT 1 FROM work_shifts WHERE user_id=NEW.user_id AND employee_id=NEW.employee_id
          AND start_at<=NEW.end_date || 'T23:59' AND end_at>NEW.start_date || 'T00:00'
        );
      END;
      ${audit('INSERT')}
      ${audit('UPDATE')}
    `);
  },
};
