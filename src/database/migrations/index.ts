import * as SQLite from 'expo-sqlite';
import { initialMigration } from './001_initial';
import { addUsersMigration } from './002_add_users';
import { addUserIsolationMigration } from './003_add_user_isolation';
import { addGuestFlagMigration } from './004_add_guest_flag';

export interface Migration {
  version: number;
  name: string;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  initialMigration,
  addUsersMigration,
  addUserIsolationMigration,
  addGuestFlagMigration,
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // Create migrations tracking table
    console.log('Creating schema_migrations table...');
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
    console.log(`Current database version: ${currentVersion}`);

    // Run pending migrations
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        try {
          await migration.up(db);
          await db.runAsync(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
            [migration.version, migration.name, new Date().toISOString()]
          );
          console.log(`Migration ${migration.version} completed successfully`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      } else {
        console.log(`Skipping migration ${migration.version}: ${migration.name} (already applied)`);
      }
    }

    console.log('All migrations completed');
  } catch (error) {
    console.error('Migration system error:', error);
    throw error;
  }
}
