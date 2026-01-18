import * as SQLite from 'expo-sqlite';
import { initialMigration } from './001_initial';
import { addUsersMigration } from './002_add_users';
import { addUserIsolationMigration } from './003_add_user_isolation';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  initialMigration,
  addUsersMigration,
  addUserIsolationMigration,
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Get current migration version
  const result = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
  );
  const currentVersion = result.length > 0 ? result[0].version : 0;

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        [migration.version, migration.name, new Date().toISOString()]
      );
      console.log(`Migration ${migration.version} completed`);
    }
  }
}
