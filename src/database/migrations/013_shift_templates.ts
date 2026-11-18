import type { Migration } from './index';

function auditTemplate(event: 'INSERT' | 'DELETE', action: string) {
  const row = event === 'DELETE' ? 'OLD' : 'NEW';
  return `CREATE TRIGGER audit_${action} AFTER ${event} ON work_shift_templates BEGIN
    INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
      VALUES(lower(hex(randomblob(16))),${row}.user_id,'${action}','${action}','workforce',${row}.id,
        json_object('name',${row}.name,'date',${row}.week_start),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
    END;`;
}

export const shiftTemplatesMigration: Migration = {
  version: 13,
  name: 'shift_templates',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE work_shift_templates (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL COLLATE NOCASE CHECK(length(trim(name)) BETWEEN 1 AND 80),
        week_start TEXT NOT NULL,
        shifts TEXT NOT NULL CHECK(json_valid(shifts) AND json_array_length(shifts)>0),
        UNIQUE(user_id,name)
      );
      ${auditTemplate('INSERT', 'template_created')}
      ${auditTemplate('DELETE', 'template_deleted')}
    `);
  },
};
