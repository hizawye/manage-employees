import type { Migration } from './index';

export const openShiftMigration: Migration = {
  version: 16,
  name: 'open_shifts',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE open_shifts (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_at TEXT NOT NULL, end_at TEXT NOT NULL CHECK(end_at>start_at), role TEXT NOT NULL, location TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','filled','cancelled')), assigned_name TEXT, assigned_id TEXT);
      CREATE INDEX open_shifts_owner ON open_shifts(user_id,status,start_at);
      CREATE TABLE shift_bids (offer_id TEXT NOT NULL REFERENCES open_shifts(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE, PRIMARY KEY(offer_id,employee_id));
      CREATE TRIGGER guard_shift_bid BEFORE INSERT ON shift_bids BEGIN
        SELECT RAISE(ABORT,'coverage.unavailable') WHERE NOT EXISTS (SELECT 1 FROM open_shifts o JOIN employees e ON e.user_id=o.user_id
          WHERE o.id=NEW.offer_id AND o.status='open' AND e.id=NEW.employee_id AND e.status='active'); END;
      CREATE TRIGGER fill_open_shift AFTER UPDATE OF status ON open_shifts WHEN OLD.status='open' AND NEW.status='filled' BEGIN
        SELECT RAISE(ABORT,'coverage.unavailable') WHERE NOT EXISTS(SELECT 1 FROM shift_bids WHERE offer_id=NEW.id AND employee_id=NEW.assigned_id);
        INSERT INTO work_shifts(id,user_id,employee_id,start_at,end_at,role,location,notes)
        VALUES(NEW.id,NEW.user_id,NEW.assigned_id,NEW.start_at,NEW.end_at,NEW.role,NEW.location,''); END;
      CREATE TRIGGER audit_offer_created AFTER INSERT ON open_shifts BEGIN
        INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at) VALUES(lower(hex(randomblob(16))),NEW.user_id,
          'offer_created','offer_created','workforce',NEW.id,json_object('name',NEW.role,'date',substr(NEW.start_at,1,10)),strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
      CREATE TRIGGER audit_offer_review AFTER UPDATE OF status ON open_shifts WHEN OLD.status <> NEW.status BEGIN
        INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at) VALUES(lower(hex(randomblob(16))),NEW.user_id,
          'offer_'||NEW.status,'offer_'||NEW.status,'workforce',NEW.id,json_object('name',coalesce(NEW.assigned_name,NEW.role),'date',substr(NEW.start_at,1,10)),strftime('%Y-%m-%dT%H:%M:%fZ','now')); END;
      CREATE TRIGGER audit_offer_interest AFTER INSERT ON shift_bids BEGIN
        INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
          SELECT lower(hex(randomblob(16))),o.user_id,'offer_interest','offer_interest','workforce',o.id,json_object('name',e.name,'date',substr(o.start_at,1,10)),strftime('%Y-%m-%dT%H:%M:%fZ','now')
          FROM open_shifts o JOIN employees e ON e.user_id=o.user_id WHERE o.id=NEW.offer_id AND e.id=NEW.employee_id; END;
    `);
  },
};
