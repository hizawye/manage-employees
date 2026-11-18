import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { SQLiteDatabase } from 'expo-sqlite';

// Keep one real SQLite connection alive for a test, including its transactions and foreign keys.
// Python's standard library is available on CI with Node 20 (which predates node:sqlite).
const worker = `
import json, sqlite3, sys
db = sqlite3.connect(':memory:', isolation_level=None)
db.row_factory = sqlite3.Row
db.execute('PRAGMA foreign_keys = ON')
for line in sys.stdin:
    try:
        method, sql, params = json.loads(line)
        if method == 'exec':
            statement = ''
            for char in sql:
                statement += char
                if char == ';' and sqlite3.complete_statement(statement):
                    db.execute(statement)
                    statement = ''
            if statement.strip():
                db.execute(statement)
            result = None
        else:
            cursor = db.execute(sql, params)
            if method == 'first':
                row = cursor.fetchone()
                result = dict(row) if row else None
            elif method == 'all':
                result = [dict(row) for row in cursor.fetchall()]
            else:
                result = dict(changes=cursor.rowcount, lastInsertRowId=cursor.lastrowid)
        print(json.dumps(dict(result=result)), flush=True)
    except Exception as error:
        print(json.dumps(dict(error=str(error))), flush=True)
`;

export function openTestDatabase(): SQLiteDatabase {
  const child = spawn('python3', ['-u', '-c', worker], { stdio: ['pipe', 'pipe', 'inherit'] });
  const responses = createInterface({ input: child.stdout });
  const pending: { resolve: (result: unknown) => void; reject: (reason: Error) => void }[] = [];
  const closed = new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`SQLite worker exited with ${code}`)));
  });
  void closed.catch((error: Error) => pending.splice(0).forEach((request) => request.reject(error)));
  responses.on('line', (line) => {
    const request = pending.shift();
    if (!request) return;
    const { result, error } = JSON.parse(line);
    if (error) request.reject(new Error(error));
    else request.resolve(result);
  });

  function query(method: string, sql: string, params: unknown[] = []) {
    return new Promise((resolve, reject) => {
      pending.push({ resolve, reject });
      child.stdin.write(JSON.stringify([method, sql, params]) + '\n');
    });
  }

  const db = {
    execAsync: (sql: string) => query('exec', sql),
    runAsync: (sql: string, params?: unknown[]) => query('run', sql, params),
    getFirstAsync: (sql: string, params?: unknown[]) => query('first', sql, params),
    getAllAsync: (sql: string, params?: unknown[]) => query('all', sql, params),
    async withTransactionAsync(action: () => Promise<void>) {
      await db.execAsync('BEGIN');
      try {
        await action();
        await db.execAsync('COMMIT');
      } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
      }
    },
    async closeAsync() {
      child.stdin.end();
      await closed;
    },
  };
  return db as unknown as SQLiteDatabase;
}
