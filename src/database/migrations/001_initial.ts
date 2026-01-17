import { Migration } from './index';

export const initialMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  up: async (db: any) => {
    // Create employees table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL,
        wageType TEXT NOT NULL,
        wageRate REAL NOT NULL,
        joinDate TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    // Create attendance table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        employeeId TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        hoursWorked REAL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (employeeId) REFERENCES employees (id) ON DELETE CASCADE,
        UNIQUE(employeeId, date)
      );
    `);

    // Create indices for better query performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employeeId);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employeeId, date);
    `);
  },
};
