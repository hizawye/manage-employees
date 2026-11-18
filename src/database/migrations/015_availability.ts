import type { Migration } from './index';
import { recurringConflict } from '../weeklyAvailabilitySql';

function shiftGuard(event: 'INSERT' | 'UPDATE') {
  return `CREATE TRIGGER check_availability_${event} BEFORE ${event} ON work_shifts BEGIN
    SELECT RAISE(ABORT,'schedule.unavailable') WHERE EXISTS (
      SELECT 1 FROM weekly_unavailability a WHERE a.user_id=NEW.user_id AND a.employee_id=NEW.employee_id
        AND ${recurringConflict('a', 'NEW.start_at', 'NEW.end_at')}
    );
  END;`;
}

function ruleGuard(event: 'INSERT' | 'UPDATE') {
  return `CREATE TRIGGER guard_availability_${event} BEFORE ${event} ON weekly_unavailability BEGIN
    SELECT RAISE(ABORT,'schedule.inactive') WHERE NOT EXISTS (
      SELECT 1 FROM employees WHERE user_id=NEW.user_id AND id=NEW.employee_id AND status='active');
    SELECT RAISE(ABORT,'schedule.booked') WHERE EXISTS (
      SELECT 1 FROM work_shifts s WHERE s.user_id=NEW.user_id AND s.employee_id=NEW.employee_id
        AND s.end_at>NEW.effective_date || 'T00:00' AND ${recurringConflict('NEW', 's.start_at', 's.end_at')}
    );
  END;`;
}

function audit(event: 'INSERT' | 'UPDATE' | 'DELETE', action: string) {
  const row = event === 'DELETE' ? 'OLD' : 'NEW';
  return `CREATE TRIGGER audit_${action} AFTER ${event} ON weekly_unavailability BEGIN
    INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
      SELECT lower(hex(randomblob(16))),${row}.user_id,'${action}','${action}','workforce',${row}.id,
       json_object('employeeName',name,'date',${row}.effective_date),strftime('%Y-%m-%dT%H:%M:%fZ','now')
       FROM employees WHERE id=${row}.employee_id AND user_id=${row}.user_id;
  END;`;
}

export const availabilityMigration: Migration = {
  version: 15,
  name: 'weekly_employee_unavailability',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE weekly_unavailability (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
        start_minute INTEGER NOT NULL CHECK(start_minute BETWEEN 0 AND 1439),
        duration INTEGER NOT NULL CHECK(duration BETWEEN 1 AND 1440),
        effective_date TEXT NOT NULL CHECK(date(effective_date,'+0 days') IS effective_date),
        UNIQUE(user_id,employee_id,weekday,start_minute,duration)
      );
      ${shiftGuard('INSERT')}
      ${shiftGuard('UPDATE')}
      ${ruleGuard('INSERT')}
      ${ruleGuard('UPDATE')}
      ${audit('INSERT', 'availability_created')}
      ${audit('UPDATE', 'availability_updated')}
      ${audit('DELETE', 'availability_deleted')}
    `);
  },
};
