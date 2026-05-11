import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addPaymentsTableMigration: Migration = {
    version: 6,
    name: 'add_payments_table',
    up: async (db: SQLite.SQLiteDatabase) => {
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        employee_id TEXT NOT NULL,
        amount REAL NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON payments(employee_id);
      CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(employee_id, period_start, period_end);
    `);
    },
};
