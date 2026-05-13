import * as Crypto from 'expo-crypto';
import { getDatabase } from '../index';
import { Payment, CreatePaymentInput } from '../../models';
import { assertEmployeeOwnedByUser } from './ownership';

interface PaymentRow {
  id: string;
  user_id: number;
  employee_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
}

function mapRowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    userId: row.user_id,
    employeeId: row.employee_id,
    amount: row.amount,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    paymentDate: row.payment_date,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export async function createPayment(userId: number, input: CreatePaymentInput): Promise<Payment> {
  const db = await getDatabase();
  await assertEmployeeOwnedByUser(userId, input.employeeId);

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO payments (id, user_id, employee_id, amount, period_start, period_end, payment_date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, input.employeeId, input.amount, input.periodStart, input.periodEnd, input.paymentDate, input.notes || null, now]
  );

  return {
    ...input,
    id,
    createdAt: now,
  };
}

export async function getPaymentsByEmployee(
  userId: number,
  employeeId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<Payment[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM payments WHERE user_id = ? AND employee_id = ?';
  const params: (string | number)[] = [userId, employeeId];

  if (periodStart) {
    query += ' AND period_start = ?';
    params.push(periodStart);
  }
  if (periodEnd) {
    query += ' AND period_end = ?';
    params.push(periodEnd);
  }

  query += ' ORDER BY payment_date DESC';

  const rows = await db.getAllAsync<PaymentRow>(query, params);
  return rows.map(mapRowToPayment);
}

export async function getTotalPaidForPeriod(
  userId: number,
  employeeId: string,
  periodStart: string,
  periodEnd: string
): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    'SELECT SUM(amount) as total FROM payments WHERE user_id = ? AND employee_id = ? AND period_start = ? AND period_end = ?',
    [userId, employeeId, periodStart, periodEnd]
  );
  return result?.total || 0;
}

export async function deletePayment(userId: number, id: string): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM payments WHERE id = ? AND user_id = ?', [id, userId]);
  if (result.changes === 0) {
    throw new Error('Payment not found');
  }
}

export async function getAllPaymentsByUser(userId: number, limit = 100): Promise<Payment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PaymentRow>(
    'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, limit]
  );
  return rows.map(mapRowToPayment);
}
