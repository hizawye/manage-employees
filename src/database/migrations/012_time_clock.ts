import type { Migration } from './index';

function clockAudit(
  table: 'clock_entries' | 'clock_breaks',
  event: 'INSERT' | 'UPDATE',
  action: string
) {
  const time = event === 'INSERT' ? 'NEW.started_at' : 'NEW.ended_at';
  const entry = table === 'clock_entries' ? 'NEW.id' : 'NEW.entry_id';
  const changed = event === 'UPDATE' ? 'OF ended_at' : '';
  const when = event === 'UPDATE' ? 'WHEN OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL' : '';
  return `CREATE TRIGGER audit_${action} AFTER ${event} ${changed} ON ${table} ${when}
    BEGIN
      INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
        SELECT lower(hex(randomblob(16))), c.user_id, '${action}', '${action}', 'workforce', NEW.id,
          json_object('employeeName',e.name,'date',date(${time}/1000,'unixepoch','localtime')),
          strftime('%Y-%m-%dT%H:%M:%fZ','now')
        FROM clock_entries c JOIN employees e ON e.id=c.employee_id AND e.user_id=c.user_id WHERE c.id=${entry};
    END;`;
}

export const timeClockMigration: Migration = {
  version: 12,
  name: 'time_clock',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE clock_entries (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        started_at INTEGER NOT NULL,
        ended_at INTEGER CHECK (ended_at >= started_at)
      );
      CREATE UNIQUE INDEX idx_clock_active ON clock_entries(user_id,employee_id) WHERE ended_at IS NULL;
      CREATE INDEX idx_clock_employee_time ON clock_entries(user_id,employee_id,started_at);
      CREATE TABLE clock_breaks (
        id TEXT PRIMARY KEY NOT NULL,
        entry_id TEXT NOT NULL REFERENCES clock_entries(id) ON DELETE CASCADE,
        started_at INTEGER NOT NULL,
        ended_at INTEGER CHECK (ended_at >= started_at),
        paid INTEGER NOT NULL CHECK (paid IN (0,1))
      );
      CREATE INDEX idx_clock_break_entry ON clock_breaks(entry_id,started_at);
      CREATE UNIQUE INDEX idx_clock_open_break ON clock_breaks(entry_id) WHERE ended_at IS NULL;
      CREATE TRIGGER close_running_break AFTER UPDATE OF ended_at ON clock_entries
        WHEN OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL
        BEGIN UPDATE clock_breaks SET ended_at=NEW.ended_at WHERE entry_id=NEW.id AND ended_at IS NULL; END;
      ${clockAudit('clock_entries', 'INSERT', 'clock_in')}
      ${clockAudit('clock_entries', 'UPDATE', 'clock_out')}
      ${clockAudit('clock_breaks', 'INSERT', 'clock_break_start')}
      ${clockAudit('clock_breaks', 'UPDATE', 'clock_break_end')}
    `);
  },
};
