import { Migration } from './index';
import { initialMigration } from './001_initial';

const allMigrations: Migration[] = [initialMigration];

export class MigrationRunner {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Initialize migration tracking table
   */
  private async initMigrationTable(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        appliedAt TEXT NOT NULL
      );
    `);
  }

  /**
   * Get current migration version
   */
  private async getCurrentVersion(): Promise<number> {
    const result = await this.db.getFirstAsync(
      'SELECT MAX(version) as version FROM migrations'
    );
    return result?.version || 0;
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      await this.initMigrationTable();
      const currentVersion = await this.getCurrentVersion();

      const pendingMigrations = allMigrations.filter(
        (migration) => migration.version > currentVersion
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }

      console.log(`Running ${pendingMigrations.length} migration(s)...`);

      for (const migration of pendingMigrations) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);

        // Run migration in a transaction
        await this.db.withTransactionAsync(async () => {
          await migration.up(this.db);

          // Record migration
          await this.db.runAsync(
            'INSERT INTO migrations (version, name, appliedAt) VALUES (?, ?, ?)',
            [migration.version, migration.name, new Date().toISOString()]
          );
        });

        console.log(`Migration ${migration.version} applied successfully`);
      }

      console.log('All migrations completed');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get migration history
   */
  async getMigrationHistory(): Promise<
    Array<{ version: number; name: string; appliedAt: string }>
  > {
    await this.initMigrationTable();
    return this.db.getAllAsync('SELECT * FROM migrations ORDER BY version ASC');
  }
}
