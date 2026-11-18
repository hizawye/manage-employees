import { randomUUID } from 'expo-crypto';
import { getDatabase } from '../database';
import { recurringConflict } from '../database/weeklyAvailabilitySql';
import { isPayrollDate } from '../utils/payrollDate';
import { normalizeShiftTime, shiftBounds } from './WorkShiftService';

export interface AvailabilityInput {
  employeeId: string;
  weekday: number;
  allDay: boolean;
  start: string;
  end: string;
  effective: string;
}
export interface AvailabilityRule {
  id: string;
  employeeId: string;
  employeeName: string;
  weekday: number;
  start: number;
  duration: number;
  effective: string;
}
export function wallTime(minute: number) {
  const time = minute % 1440;
  return String(Math.floor(time / 60)).padStart(2, '0') + ':' + String(time % 60).padStart(2, '0');
}
function minuteOfDay(input: string) {
  const [hours, minutes] = normalizeShiftTime(input).split(':').map(Number);
  return hours * 60 + minutes;
}
export async function listUnavailable(owner: number) {
  const db = await getDatabase();
  return db.getAllAsync<AvailabilityRule>(
    `
    SELECT a.id,a.employee_id AS employeeId,e.name AS employeeName,a.weekday,a.start_minute AS start,a.duration,
      a.effective_date AS effective FROM weekly_unavailability a JOIN employees e ON e.id=a.employee_id AND e.user_id=a.user_id
    WHERE a.user_id=? ORDER BY e.name,a.weekday,a.start_minute,a.id`,
    [owner]
  );
}
export async function saveUnavailable(owner: number, input: AvailabilityInput, id?: string) {
  if (
    !isPayrollDate(input.effective) ||
    !Number.isInteger(input.weekday) ||
    input.weekday < 0 ||
    input.weekday > 6
  )
    throw new Error('schedule.invalidDate');
  if (!input.employeeId) throw new Error('schedule.selectEmployee');
  const start = input.allDay ? 0 : minuteOfDay(input.start);
  const duration = input.allDay ? 1440 : (minuteOfDay(input.end) - start + 1440) % 1440;
  if (!duration) throw new Error('schedule.sameTime');
  const db = await getDatabase();
  const fields = [input.employeeId, input.weekday, start, duration, input.effective];
  try {
    if (id) {
      const update = await db.runAsync(
        'UPDATE weekly_unavailability SET employee_id=?,weekday=?,start_minute=?,duration=?,effective_date=? WHERE user_id=? AND id=?',
        [...fields, owner, id]
      );
      if (!update.changes) throw new Error('schedule.missingRule');
      return id;
    }
    const key = randomUUID();
    await db.runAsync(
      'INSERT INTO weekly_unavailability(employee_id,weekday,start_minute,duration,effective_date,user_id,id) VALUES (?,?,?,?,?,?,?)',
      [...fields, owner, key]
    );
    return key;
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed: weekly_unavailability'))
      throw new Error('schedule.duplicateRule');
    throw error;
  }
}
export async function deleteUnavailable(owner: number, id: string) {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM weekly_unavailability WHERE user_id=? AND id=?', [owner, id]);
  if (!result.changes) throw new Error('schedule.missingRule');
}

export async function eligibleStaff(
  owner: number,
  date: string,
  startTime: string,
  endTime: string,
  editingId?: string
) {
  const { startAt, endAt } = shiftBounds(date, startTime, endTime);
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    `
    WITH slot AS (SELECT ? AS begins,? AS ends)
    SELECT e.id FROM employees e CROSS JOIN slot WHERE e.user_id=? AND e.status='active'
      AND NOT EXISTS(SELECT 1 FROM work_shifts s WHERE s.user_id=e.user_id AND s.employee_id=e.id AND s.id<>?
        AND s.start_at<slot.ends AND s.end_at>slot.begins)
      AND NOT EXISTS(SELECT 1 FROM work_shift_unavailability u WHERE u.user_id=e.user_id AND u.employee_id=e.id
        AND u.start_at<slot.ends AND u.end_at>slot.begins)
      AND NOT EXISTS(SELECT 1 FROM weekly_unavailability a WHERE a.user_id=e.user_id AND a.employee_id=e.id
        AND ${recurringConflict('a', 'slot.begins', 'slot.ends')})
    ORDER BY e.name,e.id`,
    [startAt, endAt, owner, editingId ?? '']
  );
  return rows.map((row) => row.id);
}
