import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addUserIsolationMigration: Migration = {
  version: 3,
  name: 'add_user_isolation',
  up: async (db: SQLite.SQLiteDatabase) => {
    const legacyUserId = await ensureLegacyImportUser(db);

    // Check if user_id column exists in employees table
    const employeesColumns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(employees);'
    );
    const employeesHasUserId = employeesColumns.some(col => col.name === 'user_id');

    // Add user_id column to employees table if it doesn't exist
    if (!employeesHasUserId) {
      await db.execAsync(`
        ALTER TABLE employees ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;
      `);
    }
    await db.runAsync('UPDATE employees SET user_id = ? WHERE user_id = 0', [legacyUserId]);

    // Check if user_id column exists in attendance table
    const attendanceColumns = await db.getAllAsync<{ name: string }>(
      'PRAGMA table_info(attendance);'
    );
    const attendanceHasUserId = attendanceColumns.some(col => col.name === 'user_id');

    // Add user_id column to attendance table if it doesn't exist
    if (!attendanceHasUserId) {
      await db.execAsync(`
        ALTER TABLE attendance ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;
      `);
    }
    await db.runAsync('UPDATE attendance SET user_id = ? WHERE user_id = 0', [legacyUserId]);

    // Create indices for better query performance with user_id
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
    `);

    // Create composite index for common queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_employees_user_status ON employees(user_id, status);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_attendance_user_employee ON attendance(user_id, employee_id);
    `);
  },
};

async function ensureLegacyImportUser(db: SQLite.SQLiteDatabase): Promise<number> {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM users WHERE username = ?',
    ['legacy_import']
  );

  if (existing) {
    return existing.id;
  }

  const result = await db.runAsync(
    'INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)',
    ['legacy_import', 'legacy_import_disabled', 'legacy_import_disabled', new Date().toISOString()]
  );

  return result.lastInsertRowId;
}
