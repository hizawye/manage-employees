import * as Crypto from 'expo-crypto';
import { getDatabase } from '../index';
import { CreateWageAdjustmentInput, WageAdjustment } from '../../models';
import { assertEmployeeOwnedByUser } from './ownership';

interface WageAdjustmentRow {
  id: string;
  user_id: number;
  employee_id: string;
  date: string;
  amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: WageAdjustmentRow): WageAdjustment {
  return {
    id: row.id,
    userId: row.user_id,
    employeeId: row.employee_id,
    date: row.date,
    amount: row.amount,
    note: row.note || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertWageAdjustment(
  userId: number,
  input: CreateWageAdjustmentInput
): Promise<WageAdjustment> {
  await assertEmployeeOwnedByUser(userId, input.employeeId);

  const db = await getDatabase();
  const now = new Date().toISOString();
  const saved = await db.getFirstAsync<WageAdjustmentRow>(
    `INSERT INTO wage_adjustments (id, user_id, employee_id, date, amount, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, employee_id, date) DO UPDATE SET
       amount = excluded.amount, note = excluded.note, updated_at = excluded.updated_at
     RETURNING *`,
    [Crypto.randomUUID(), userId, input.employeeId, input.date, input.amount, input.note || null, now, now]
  );
  if (!saved) throw new Error('Wage adjustment was not saved');
  return mapRow(saved);
}

export async function getWageAdjustmentsByEmployee(
  userId: number,
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<WageAdjustment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WageAdjustmentRow>(
    `SELECT * FROM wage_adjustments
     WHERE user_id = ? AND employee_id = ? AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [userId, employeeId, startDate, endDate]
  );

  return rows.map(mapRow);
}
