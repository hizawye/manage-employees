import * as SQLite from 'expo-sqlite';
import { CREATE_EMPLOYEES_TABLE, CREATE_ATTENDANCE_TABLE, CREATE_INDEXES } from './schema';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync('employees.db');
  await initializeDatabase(database);
  return database;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(CREATE_EMPLOYEES_TABLE);
  await db.execAsync(CREATE_ATTENDANCE_TABLE);

  const indexStatements = CREATE_INDEXES.split(';').filter(s => s.trim());
  for (const statement of indexStatements) {
    await db.execAsync(statement + ';');
  }
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
  }
}
