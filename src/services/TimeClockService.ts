import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { getDatabase } from '../database';
import { AttendanceStatus, EmployeeStatus, WageType } from '../models';
import { APP_CONFIG } from '../config/app';
import { isPayrollDate } from '../utils/payrollDate';
import { AttendanceService } from './AttendanceService';
import { clearWageCache } from './WageCalculationService';

export interface ClockBreak {
  id: string;
  start: number;
  end: number | null;
  paid: boolean;
}
export interface ClockEntry {
  id: string;
  start: number;
  end: number | null;
  breaks: ClockBreak[];
}
interface ClockEmployee {
  id: string;
  name: string;
  status: EmployeeStatus;
  wageType: WageType;
  attendanceId: string | null;
  attendanceStatus: AttendanceStatus | null;
  attendanceHours: number | null;
  attendanceUpdated: string | null;
}
export interface ClockDay extends ClockEmployee {
  date: string;
  bounds: [number, number];
  entries: ClockEntry[];
  active: ClockEntry | null;
}
export class ClockError extends Error {
  constructor(public readonly reason: 'changed' | 'invalid' | 'noTime' | 'longDay') {
    super(reason);
  }
}

function checkTime(time: number) {
  if (!Number.isSafeInteger(time) || time < 0 || !Number.isFinite(new Date(time).getTime()))
    throw new ClockError('invalid');
}

export function clockDayBounds(date: string): [number, number] {
  if (!isPayrollDate(date)) throw new ClockError('invalid');
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

/** Clip each punch to local midnight before excluding unpaid breaks. Elapsed time stays correct on a DST change. */
export function clockDuration(entry: ClockEntry, [from, to]: [number, number], now = Date.now()) {
  const start = Math.max(from, entry.start);
  const end = Math.min(to, entry.end ?? now);
  const interval = (a: number, b: number) => Math.max(0, Math.min(end, b) - Math.max(start, a));
  let paidBreakMs = 0;
  let unpaidBreakMs = 0;
  for (const pause of entry.breaks) {
    const length = interval(pause.start, pause.end ?? end);
    if (pause.paid) paidBreakMs += length;
    else unpaidBreakMs += length;
  }
  return { workMs: interval(start, end) - unpaidBreakMs, paidBreakMs, unpaidBreakMs };
}

export function closedWorkMs(day: ClockDay): number {
  return day.entries.reduce(
    (sum, entry) => sum + (entry.end === null ? 0 : clockDuration(entry, day.bounds).workMs),
    0
  );
}

interface JoinedPunch {
  employee_id: string;
  id: string;
  started_at: number;
  ended_at: number | null;
  break_id: string | null;
  break_start: number;
  break_end: number | null;
  paid: number;
}
async function readDays(
  db: SQLiteDatabase,
  owner: number,
  date: string,
  employeeId?: string
): Promise<ClockDay[]> {
  const bounds = clockDayBounds(date);
  const people = await db.getAllAsync<ClockEmployee>(
    `SELECT e.id,e.name,e.status,COALESCE(r.wage_type,e.wage_type) AS wageType,
      a.id AS attendanceId,a.status AS attendanceStatus,a.hours_worked AS attendanceHours,a.updated_at AS attendanceUpdated
    FROM employees e LEFT JOIN pay_period_rates r ON r.user_id=e.user_id AND r.employee_id=e.id AND r.month=? LEFT JOIN attendance a ON a.employee_id=e.id AND a.user_id=e.user_id AND a.date=?
    WHERE e.user_id=? ${employeeId === undefined ? '' : 'AND e.id=?'} ORDER BY e.name COLLATE NOCASE,e.id`,
    employeeId === undefined ? [date.slice(0,7), date, owner] : [date.slice(0,7), date, owner, employeeId]
  );
  const rows = await db.getAllAsync<JoinedPunch>(
    `SELECT c.employee_id,c.id,c.started_at,c.ended_at,
      b.id AS break_id,b.started_at AS break_start,b.ended_at AS break_end,b.paid
    FROM clock_entries c LEFT JOIN clock_breaks b ON b.entry_id=c.id WHERE c.user_id=?
      AND (c.ended_at IS NULL OR (c.started_at<? AND c.ended_at>=?)) ${employeeId === undefined ? '' : 'AND c.employee_id=?'}
    ORDER BY c.started_at DESC,c.id,b.started_at ASC,b.id`,
    employeeId === undefined
      ? [owner, bounds[1], bounds[0]]
      : [owner, bounds[1], bounds[0], employeeId]
  );
  const days = new Map<string, ClockDay>(
    people.map((person) => [person.id, { ...person, date, bounds, entries: [], active: null }])
  );
  const shifts = new Map<string, ClockEntry>();
  for (const row of rows) {
    const day = days.get(row.employee_id);
    if (!day) continue;
    let entry = shifts.get(row.id);
    if (!entry) {
      entry = { id: row.id, start: row.started_at, end: row.ended_at, breaks: [] };
      shifts.set(entry.id, entry);
      if (entry.end === null) day.active = entry;
      const end = entry.end ?? Date.now();
      const startsAtMidnight = entry.start === bounds[0] && end === bounds[0];
      if (entry.start < bounds[1] && (end > bounds[0] || startsAtMidnight)) day.entries.push(entry);
    }
    if (row.break_id)
      entry.breaks.push({
        id: row.break_id,
        start: row.break_start,
        end: row.break_end,
        paid: !!row.paid,
      });
  }
  return [...days.values()].filter(
    (day) => day.status === EmployeeStatus.ACTIVE || day.entries.length || day.active
  );
}

export async function getClockDays(owner: number, date: string) {
  return readDays(await getDatabase(), owner, date);
}

export async function clockIn(
  owner: number,
  employeeId: string,
  id = randomUUID(),
  at = Date.now()
): Promise<void> {
  checkTime(at);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO clock_entries(id,user_id,employee_id,started_at)
    SELECT ?,e.user_id,e.id,? FROM employees e WHERE e.id=? AND e.user_id=? AND e.status='active'
      AND NOT EXISTS (SELECT 1 FROM clock_entries c WHERE c.user_id=e.user_id AND c.employee_id=e.id
        AND (c.ended_at IS NULL OR c.ended_at>?)) ON CONFLICT DO NOTHING`,
    [id, at, employeeId, owner, at]
  );
  if (
    !result.changes &&
    !(await db.getFirstAsync(
      'SELECT id FROM clock_entries WHERE id=? AND user_id=? AND employee_id=?',
      [id, owner, employeeId]
    ))
  )
    throw new ClockError('changed');
}

export async function startClockBreak(
  owner: number,
  entryId: string,
  paid: boolean,
  id = randomUUID(),
  at = Date.now()
) {
  checkTime(at);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO clock_breaks(id,entry_id,started_at,paid)
    SELECT ?,c.id,?,? FROM clock_entries c WHERE c.id=? AND c.user_id=? AND c.ended_at IS NULL AND c.started_at<=?
      AND NOT EXISTS (SELECT 1 FROM clock_breaks b WHERE b.entry_id=c.id AND (b.ended_at IS NULL OR b.ended_at>?))
    ON CONFLICT DO NOTHING`,
    [id, at, Number(paid), entryId, owner, at, at]
  );
  if (
    !result.changes &&
    !(await db.getFirstAsync(
      'SELECT b.id FROM clock_breaks b JOIN clock_entries c ON b.entry_id=c.id WHERE b.id=? AND c.id=? AND c.user_id=? AND b.paid=?',
      [id, entryId, owner, Number(paid)]
    ))
  )
    throw new ClockError('changed');
}

export async function endClockBreak(owner: number, breakId: string, at = Date.now()) {
  checkTime(at);
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE clock_breaks SET ended_at=? WHERE id=? AND ended_at IS NULL AND started_at<=?
    AND entry_id IN (SELECT id FROM clock_entries WHERE user_id=? AND ended_at IS NULL)`,
    [at, breakId, at, owner]
  );
  if (
    !result.changes &&
    !(await db.getFirstAsync(
      'SELECT b.id FROM clock_breaks b JOIN clock_entries c ON c.id=b.entry_id WHERE b.id=? AND c.user_id=? AND b.ended_at IS NOT NULL',
      [breakId, owner]
    ))
  )
    throw new ClockError('changed');
}

export async function clockOut(owner: number, entryId: string, at = Date.now()) {
  checkTime(at);
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE clock_entries SET ended_at=? WHERE id=? AND user_id=? AND ended_at IS NULL AND started_at<=?
    AND NOT EXISTS (SELECT 1 FROM clock_breaks WHERE entry_id=? AND COALESCE(ended_at,started_at)>?)`,
    [at, entryId, owner, at, entryId, at]
  );
  if (
    !result.changes &&
    !(await db.getFirstAsync(
      'SELECT id FROM clock_entries WHERE id=? AND user_id=? AND ended_at IS NOT NULL',
      [entryId, owner]
    ))
  )
    throw new ClockError('changed');
}

export type PayStatus = AttendanceStatus.PRESENT | AttendanceStatus.HALF_DAY;

/** Re-read under a write transaction so an attendance edit made after the manager's preview cannot be lost. */
export async function postClockAttendance(owner: number, preview: ClockDay, status: PayStatus) {
  const db = await getDatabase();
  if (status !== AttendanceStatus.PRESENT && status !== AttendanceStatus.HALF_DAY)
    throw new ClockError('invalid');
  const seenTime = closedWorkMs(preview);
  await db.withExclusiveTransactionAsync(async (txn) => {
    const [day] = await readDays(txn, owner, preview.date, preview.id);
    if (!day || day.wageType !== preview.wageType || closedWorkMs(day) !== seenTime)
      throw new ClockError('changed');
    if (!seenTime) throw new ClockError('noTime');
    if (day.entries.some((entry) => entry.end === null)) throw new ClockError('changed');
    const hourly = day.wageType === WageType.HOURLY;
    if (hourly && status !== AttendanceStatus.PRESENT) throw new ClockError('invalid');
    const hours = hourly ? seenTime / 3_600_000 : null;
    if (hours !== null && hours > APP_CONFIG.attendance.maxHoursPerDay)
      throw new ClockError('longDay');
    if (day.attendanceStatus === status && day.attendanceHours === hours) return;
    if (
      day.attendanceId !== preview.attendanceId ||
      day.attendanceUpdated !== preview.attendanceUpdated ||
      day.attendanceStatus !== preview.attendanceStatus ||
      day.attendanceHours !== preview.attendanceHours
    )
      throw new ClockError('changed');
    const now = new Date().toISOString();
    const id = day.attendanceId ?? randomUUID();
    if (day.attendanceId) {
      await txn.runAsync(
        'UPDATE attendance SET status=?,hours_worked=?,updated_at=? WHERE user_id=? AND id=?',
        [status, hours, now, owner, id]
      );
    } else {
      await txn.runAsync(
        'INSERT INTO attendance(id,user_id,employee_id,date,status,hours_worked,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
        [id, owner, day.id, day.date, status, hours, now, now]
      );
    }
    await txn.runAsync(
      `INSERT INTO logs(id,user_id,action,description,entity_type,entity_id,details,created_at)
      VALUES(?,?,'clock_attendance','clock_attendance','workforce',?,?,?)`,
      [
        randomUUID(),
        owner,
        id,
        JSON.stringify({ employeeName: day.name, date: day.date, status, hoursWorked: hours }),
        now,
      ]
    );
  });
  AttendanceService.clearCache(owner, preview.id, preview.date);
  clearWageCache(owner, preview.id);
}
