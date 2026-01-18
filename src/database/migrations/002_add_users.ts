import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addUsersMigration: Migration = {
  version: 2,
  name: 'add_users_table',
  up: async (db: SQLite.SQLiteDatabase) => {
    // Create users table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Create index for faster username lookups
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
  },
};
