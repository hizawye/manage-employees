import * as Crypto from 'expo-crypto';
import { getDatabase } from '../database';
import { isPayrollDate } from '../utils/payrollDate';

export const leaveTypes = ['vacation', 'sick', 'personal', 'other'] as const;
export const leaveStatuses = [
  'pending',
  'approved',
  'declined',
  'cancelled',
] as const;
export type LeaveType = (typeof leaveTypes)[number];
export type LeaveStatus = (typeof leaveStatuses)[number];
export type LeaveDecision = Exclude<LeaveStatus, 'pending'>;

export interface TimeOffInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  note: string;
}

export interface TimeOffRequest extends TimeOffInput {
  id: string;
  employeeName: string;
  status: LeaveStatus;
}

export async function listTimeOff(
  owner: number,
  status?: LeaveStatus
): Promise<TimeOffRequest[]> {
  const db = await getDatabase();
  return db.getAllAsync<TimeOffRequest>(
    `
    SELECT r.id, r.employee_id AS employeeId, e.name AS employeeName,
      r.start_date AS startDate, r.end_date AS endDate, r.type, r.status, r.note
    FROM time_off_requests r JOIN employees e ON e.id=r.employee_id AND e.user_id=r.user_id
    WHERE r.user_id=? ${status ? 'AND r.status=?' : ''}
    ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
      CASE WHEN r.status='pending' THEN r.start_date END ASC, r.updated_at DESC, r.id
  `,
    status ? [owner, status] : [owner]
  );
}

export async function requestTimeOff(
  owner: number,
  input: TimeOffInput
): Promise<string> {
  if (
    !isPayrollDate(input.startDate) ||
    !isPayrollDate(input.endDate) ||
    input.startDate > input.endDate
  ) {
    throw new Error('leave.invalidDates');
  }
  if (!leaveTypes.includes(input.type)) throw new Error('leave.invalidType');
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO time_off_requests
    (id,user_id,employee_id,type,start_date,end_date,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id,
      owner,
      input.employeeId,
      input.type,
      input.startDate,
      input.endDate,
      input.note.trim(),
      now,
      now,
    ]
  );
  return id;
}

export async function decideTimeOff(
  owner: number,
  id: string,
  decision: LeaveDecision
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE time_off_requests SET status=?,updated_at=?
    WHERE user_id=? AND id=? AND (status='pending' OR (status='approved' AND ?='cancelled'))`,
    [decision, new Date().toISOString(), owner, id, decision]
  );
  if (!result.changes) throw new Error('leave.changed');
}

const errors = [
  'invalidDates',
  'invalidType',
  'changed',
  'unavailableEmployee',
  'shiftConflict',
  'leaveConflict',
] as const;
export function timeOffError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('UNIQUE constraint failed: time_off_requests.user_id'))
    return 'leave.duplicate';
  const key = errors.find((candidate) =>
    message.includes('leave.' + candidate)
  );
  return key ? 'leave.' + key : 'leave.saveError';
}
