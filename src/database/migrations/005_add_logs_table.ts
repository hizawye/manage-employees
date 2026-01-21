import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addLogsTableMigration: Migration = {
    version: 5,
    name: 'add_logs_table',
    up: async (db: SQLite.SQLiteDatabase) => {
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    `);
    },
};
