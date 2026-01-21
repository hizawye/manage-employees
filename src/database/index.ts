import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let database: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // If database is already initialized, return it
  if (database) {
    return database;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = initializeDatabase();

  try {
    database = await initializationPromise;
    return database;
  } finally {
    initializationPromise = null;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  console.log('Opening database...');

  const db = await SQLite.openDatabaseAsync('employees.db');

  console.log('Setting PRAGMA foreign_keys...');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  console.log('Running migrations...');
  await runMigrations(db);

  console.log('Database initialized successfully');
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
  }
}
