import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addWageAdjustmentsTableMigration: Migration = {
  version: 8,
  name: 'add_wage_adjustments_table',
  up: async (db: SQLite.SQLiteDatabase) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS wage_adjustments (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, employee_id, date)
      );

      CREATE INDEX IF NOT EXISTS idx_wage_adjustments_user_id ON wage_adjustments(user_id);
      CREATE INDEX IF NOT EXISTS idx_wage_adjustments_employee_date ON wage_adjustments(user_id, employee_id, date);
    `);
  },
};
