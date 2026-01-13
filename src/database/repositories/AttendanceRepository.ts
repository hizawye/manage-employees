import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../index';
import {
  Attendance,
  AttendanceStatus,
  CreateAttendanceInput,
  UpdateAttendanceInput,
} from '../../models';

interface AttendanceRow {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  hours_worked: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToAttendance(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    employeeId: row.employee_id,
    date: row.date,
    status: row.status as AttendanceStatus,
    hoursWorked: row.hours_worked || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createAttendance(input: CreateAttendanceInput): Promise<Attendance> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO attendance (id, employee_id, date, status, hours_worked, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.employeeId,
      input.date,
      input.status,
      input.hoursWorked || null,
      input.notes || null,
      now,
      now,
    ]
  );

  return {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttendanceRow>(
    'SELECT * FROM attendance WHERE date = ? ORDER BY created_at ASC',
    [date]
  );
  return rows.map(mapRowToAttendance);
}

export async function getAttendanceByEmployee(
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM attendance WHERE employee_id = ?';
  const params: string[] = [employeeId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date ASC';

  const rows = await db.getAllAsync<AttendanceRow>(query, params);
  return rows.map(mapRowToAttendance);
}

export async function getAttendanceByEmployeeAndDate(
  employeeId: string,
  date: string
): Promise<Attendance | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AttendanceRow>(
    'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
    [employeeId, date]
  );
  return row ? mapRowToAttendance(row) : null;
}

export async function updateAttendance(id: string, input: UpdateAttendanceInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.date !== undefined) {
    fields.push('date = ?');
    values.push(input.date);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }
  if (input.hoursWorked !== undefined) {
    fields.push('hours_worked = ?');
    values.push(input.hoursWorked || null);
  }
  if (input.notes !== undefined) {
    fields.push('notes = ?');
    values.push(input.notes || null);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE attendance SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteAttendance(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM attendance WHERE id = ?', [id]);
}

export async function upsertAttendance(input: CreateAttendanceInput): Promise<Attendance> {
  const existing = await getAttendanceByEmployeeAndDate(input.employeeId, input.date);

  if (existing) {
    await updateAttendance(existing.id, {
      status: input.status,
      hoursWorked: input.hoursWorked,
      notes: input.notes,
    });
    return {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
  }

  return createAttendance(input);
}

export async function getAttendanceInRange(
  startDate: string,
  endDate: string
): Promise<Attendance[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttendanceRow>(
    `SELECT * FROM attendance
     WHERE date >= ? AND date <= ?
     ORDER BY date ASC, employee_id ASC`,
    [startDate, endDate]
  );
  return rows.map(mapRowToAttendance);
}
