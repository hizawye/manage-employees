import * as Crypto from 'expo-crypto';
import { getDatabase } from '../index';
import {
  Attendance,
  AttendanceStatus,
  CreateAttendanceInput,
  UpdateAttendanceInput,
  LogActionType,
} from '../../models';
import { createLog } from './LogRepository';
import { getEmployeeById } from './EmployeeRepository';

interface AttendanceRow {
  id: string;
  employee_id: string;
  date: string;
  status: string;
  hours_worked: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: number;
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

export async function createAttendance(userId: number, input: CreateAttendanceInput): Promise<Attendance> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO attendance (id, user_id, employee_id, date, status, hours_worked, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      input.employeeId,
      input.date,
      input.status,
      input.hoursWorked || null,
      input.notes || null,
      now,
      now,
      now,
    ]
  );

  // Get employee name for better log description
  const employee = await getEmployeeById(userId, input.employeeId);
  await createLog(userId, {
    action: LogActionType.MARK_ATTENDANCE,
    description: `Marked attendance for ${employee?.name || input.employeeId}: ${input.status}`,
    entityType: 'attendance',
    entityId: id,
    details: JSON.stringify(input),
  });

  return {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAttendanceByDate(userId: number, date: string): Promise<Attendance[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttendanceRow>(
    'SELECT * FROM attendance WHERE user_id = ? AND date = ? ORDER BY created_at ASC',
    [userId, date]
  );
  return rows.map(mapRowToAttendance);
}

export async function getAttendanceByEmployee(
  userId: number,
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<Attendance[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM attendance WHERE user_id = ? AND employee_id = ?';
  const params: (string | number)[] = [userId, employeeId];

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
  userId: number,
  employeeId: string,
  date: string
): Promise<Attendance | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AttendanceRow>(
    'SELECT * FROM attendance WHERE user_id = ? AND employee_id = ? AND date = ?',
    [userId, employeeId, date]
  );
  return row ? mapRowToAttendance(row) : null;
}

export async function updateAttendance(userId: number, id: string, input: UpdateAttendanceInput): Promise<void> {
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
  values.push(userId);

  await db.runAsync(
    `UPDATE attendance SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  );

  await createLog(userId, {
    action: LogActionType.UPDATE_ATTENDANCE,
    description: `Updated attendance ${id}`,
    entityType: 'attendance',
    entityId: id,
    details: JSON.stringify(input),
  });
}

export async function deleteAttendance(userId: number, id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM attendance WHERE id = ? AND user_id = ?', [id, userId]);
}

export async function upsertAttendance(userId: number, input: CreateAttendanceInput): Promise<Attendance> {
  const existing = await getAttendanceByEmployeeAndDate(userId, input.employeeId, input.date);

  if (existing) {
    await updateAttendance(userId, existing.id, {
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

  return createAttendance(userId, input);
}

export async function getAttendanceInRange(
  userId: number,
  startDate: string,
  endDate: string
): Promise<Attendance[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AttendanceRow>(
    `SELECT * FROM attendance
     WHERE user_id = ? AND date >= ? AND date <= ?
     ORDER BY date ASC, employee_id ASC`,
    [userId, startDate, endDate]
  );
  return rows.map(mapRowToAttendance);
}
