import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const initialMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Drop existing tables if they exist (for clean migration)
    await db.execAsync(`DROP TABLE IF EXISTS attendance;`);
    await db.execAsync(`DROP TABLE IF EXISTS employees;`);

    // Create employees table
    await db.execAsync(`
      CREATE TABLE employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL,
        wage_type TEXT NOT NULL CHECK(wage_type IN ('daily', 'hourly')),
        wage_rate REAL NOT NULL CHECK(wage_rate >= 0),
        join_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Create attendance table
    await db.execAsync(`
      CREATE TABLE attendance (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'half_day')),
        hours_worked REAL CHECK(hours_worked >= 0),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
        UNIQUE(employee_id, date)
      );
    `);

    // Create indices for better query performance
    await db.execAsync(`
      CREATE INDEX idx_employees_status ON employees(status);
    `);

    await db.execAsync(`
      CREATE INDEX idx_attendance_employee ON attendance(employee_id);
    `);

    await db.execAsync(`
      CREATE INDEX idx_attendance_date ON attendance(date);
    `);

    await db.execAsync(`
      CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
    `);
  },
};
