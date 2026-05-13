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
  const existing = await db.getFirstAsync<WageAdjustmentRow>(
    'SELECT * FROM wage_adjustments WHERE user_id = ? AND employee_id = ? AND date = ?',
    [userId, input.employeeId, input.date]
  );

  if (existing) {
    await db.runAsync(
      'UPDATE wage_adjustments SET amount = ?, note = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [input.amount, input.note || null, now, existing.id, userId]
    );

    return {
      ...mapRow(existing),
      amount: input.amount,
      note: input.note,
      updatedAt: now,
    };
  }

  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO wage_adjustments (id, user_id, employee_id, date, amount, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, input.employeeId, input.date, input.amount, input.note || null, now, now]
  );

  return {
    ...input,
    id,
    userId,
    createdAt: now,
    updatedAt: now,
  };
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
