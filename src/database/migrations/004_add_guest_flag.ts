import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const addGuestFlagMigration: Migration = {
  version: 4,
  name: 'add_guest_flag',
  up: async (db: SQLite.SQLiteDatabase) => {
    // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
    // to make password_hash and salt nullable for guest users

    // 1. Create new users table with nullable password fields and is_guest column
    await db.execAsync(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        salt TEXT,
        created_at TEXT NOT NULL,
        is_guest INTEGER DEFAULT 0
      );
    `);

    // 2. Copy existing data from old table to new table
    await db.execAsync(`
      INSERT INTO users_new (id, username, password_hash, salt, created_at, is_guest)
      SELECT id, username, password_hash, salt, created_at, 0
      FROM users;
    `);

    // 3. Drop old table
    await db.execAsync(`DROP TABLE users;`);

    // 4. Rename new table to users
    await db.execAsync(`ALTER TABLE users_new RENAME TO users;`);

    // 5. Recreate indices
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
    `);
  },
};
