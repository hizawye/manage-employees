import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addUserIsolationMigration: Migration = {
  version: 3,
  name: 'add_user_isolation',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Clear all existing data (fresh start for multi-user support)
    await db.execAsync('DELETE FROM attendance;');
    await db.execAsync('DELETE FROM employees;');

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
