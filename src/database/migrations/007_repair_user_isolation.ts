import * as SQLite from 'expo-sqlite';
import { Migration } from './index';

export const repairUserIsolationMigration: Migration = {
  version: 7,
  name: 'repair_user_isolation',
  up: async (db: SQLite.SQLiteDatabase) => {
    const legacyUserId = await ensureLegacyImportUser(db);

    await updateIfTableExists(db, 'employees', legacyUserId);
    await updateIfTableExists(db, 'attendance', legacyUserId);
    await updateIfTableExists(db, 'payments', legacyUserId);
    await updateIfTableExists(db, 'logs', legacyUserId);
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
    'INSERT INTO users (username, password_hash, salt, created_at, is_guest) VALUES (?, ?, ?, ?, ?)',
    ['legacy_import', null, null, new Date().toISOString(), 1]
  );

  return result.lastInsertRowId;
}

async function updateIfTableExists(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  legacyUserId: number
): Promise<void> {
  const table = await db.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );

  if (!table) return;

  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
  if (!columns.some((column) => column.name === 'user_id')) return;

  await db.runAsync(`UPDATE ${tableName} SET user_id = ? WHERE user_id = 0`, [legacyUserId]);
}
