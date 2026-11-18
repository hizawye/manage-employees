import { recurringConflict } from '../database/weeklyAvailabilitySql';
import { randomUUID } from 'expo-crypto';
import { addDays, format, parseISO } from 'date-fns';
import { getDatabase } from '../database';
import { isPayrollDate } from '../utils/payrollDate';

export interface ShiftDraft {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  location: string;
  notes: string;
}

export interface WorkShift {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeStatus: 'active' | 'inactive';
  startAt: string;
  endAt: string;
  role: string;
  location: string;
  notes: string;
}

export function shiftDay(date: string, offset: number) {
  if (!isPayrollDate(date)) throw new Error('schedule.invalidDate');
  return format(addDays(parseISO(date), offset), 'yyyy-MM-dd');
}

export function normalizeShiftTime(value: string) {
  const digits = value
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776));
  const match = /^(\d{1,2}):(\d{2})$/.exec(digits);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error('schedule.invalidTime');
  return match[1].padStart(2, '0') + ':' + match[2];
}

export async function getShiftsInRange(
  owner: number,
  startDate: string,
  endDate: string,
  includeCarryIn = false
): Promise<WorkShift[]> {
  if (!isPayrollDate(startDate) || startDate > endDate) throw new Error('schedule.invalidDate');
  const until = shiftDay(endDate, 1) + 'T00:00';
  const since = startDate + 'T00:00';
  const lowerBound = includeCarryIn ? 's.end_at > ?' : 's.start_at >= ?';
  const db = await getDatabase();
  return db.getAllAsync<WorkShift>(
    `
    SELECT s.id, s.employee_id AS employeeId, e.name AS employeeName, e.status AS employeeStatus,
      s.start_at AS startAt, s.end_at AS endAt, s.role, s.location, s.notes
    FROM work_shifts s JOIN employees e ON e.id=s.employee_id AND e.user_id=s.user_id
    WHERE s.user_id=? AND ${lowerBound} AND s.start_at<? ORDER BY s.start_at,e.name,s.id
  `,
    [owner, since, until]
  );
}

export function shiftBounds(date: string, startTime: string, endTime: string) {
  if (!isPayrollDate(date)) throw new Error('schedule.invalidDate');
  const start = normalizeShiftTime(startTime);
  const end = normalizeShiftTime(endTime);
  if (start === end) throw new Error('schedule.sameTime');
  return { startAt: date + 'T' + start, endAt: (end < start ? shiftDay(date, 1) : date) + 'T' + end };
}

export async function saveWorkShift(owner: number, draft: ShiftDraft, id?: string) {
  if (!draft.employeeId) throw new Error('schedule.selectEmployee');
  const { startAt, endAt } = shiftBounds(draft.date, draft.startTime, draft.endTime);
  const fields = [
    draft.employeeId,
    startAt,
    endAt,
    draft.role.trim(),
    draft.location.trim(),
    draft.notes.trim(),
  ];
  const db = await getDatabase();
  if (id) {
    const result = await db.runAsync(
      `UPDATE work_shifts SET employee_id=?,start_at=?,end_at=?,role=?,location=?,notes=?
      WHERE user_id=? AND id=?`,
      [...fields, owner, id]
    );
    if (!result.changes) throw new Error('schedule.missing');
    return id;
  }
  const newId = randomUUID();
  await db.runAsync(
    `INSERT INTO work_shifts (employee_id,start_at,end_at,role,location,notes,user_id,id)
    VALUES (?,?,?,?,?,?,?,?)`,
    [...fields, owner, newId]
  );
  return newId;
}

export async function deleteWorkShift(owner: number, id: string) {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM work_shifts WHERE user_id=? AND id=?', [owner, id]);
  if (!result.changes) throw new Error('schedule.missing');
}

function requireWeekStart(date: string) {
  if (!isPayrollDate(date) || parseISO(date).getDay() !== 1) throw new Error('schedule.invalidDate');
}

// A single SQLite write serializes concurrent applications. Provenance survives changes to a copied shift.
async function insertAvailableShifts(
  owner: number,
  weekStart: string,
  sourceQuery: string,
  sourceParams: (string | number)[]
) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `
    INSERT INTO work_shifts (id,user_id,employee_id,start_at,end_at,role,location,notes,copied_from,copied_week)
    WITH candidates AS (${sourceQuery})
    SELECT lower(hex(randomblob(16))),?,c.employee_id,c.new_start,c.new_end,c.role,c.location,c.notes,c.source,?
    FROM candidates c JOIN employees e ON e.id=c.employee_id AND e.user_id=? AND e.status='active'
    WHERE NOT EXISTS (
      SELECT 1 FROM work_shifts s WHERE s.user_id=? AND
        ((s.copied_from=c.source AND s.copied_week=?) OR
         (s.employee_id=c.employee_id AND s.start_at<c.new_end AND s.end_at>c.new_start))
    ) AND NOT EXISTS (
      SELECT 1 FROM work_shift_unavailability u WHERE u.user_id=? AND u.employee_id=c.employee_id
        AND u.start_at<c.new_end AND u.end_at>c.new_start
    ) AND NOT EXISTS (
      SELECT 1 FROM weekly_unavailability a WHERE a.user_id=e.user_id AND a.employee_id=c.employee_id
        AND ${recurringConflict('a', 'c.new_start', 'c.new_end')}
    )
  `,
    [...sourceParams, owner, weekStart, owner, owner, weekStart, owner]
  );
  return result.changes;
}

export async function copyPreviousWeek(owner: number, weekStart: string): Promise<number> {
  requireWeekStart(weekStart);
  return insertAvailableShifts(
    owner,
    weekStart,
    `
    SELECT id AS source,employee_id,role,location,notes,
      strftime('%Y-%m-%dT%H:%M',start_at,'+7 days') AS new_start,
      strftime('%Y-%m-%dT%H:%M',end_at,'+7 days') AS new_end
    FROM work_shifts WHERE user_id=? AND start_at>=? AND start_at<?
  `,
    [owner, shiftDay(weekStart, -7) + 'T00:00', weekStart + 'T00:00']
  );
}

export interface ShiftTemplate {
  id: string;
  name: string;
  count: number;
}

export async function listShiftTemplates(owner: number): Promise<ShiftTemplate[]> {
  const db = await getDatabase();
  return db.getAllAsync<ShiftTemplate>(
    'SELECT id,name,json_array_length(shifts) AS count FROM work_shift_templates WHERE user_id=? ORDER BY name,id',
    [owner]
  );
}

export async function saveShiftTemplate(owner: number, weekStart: string, name: string) {
  requireWeekStart(weekStart);
  const title = name.trim();
  if (!title || title.length > 80) throw new Error('schedule.templateNameError');
  const db = await getDatabase();
  const id = randomUUID();
  const saved = await db.runAsync(
    `
    INSERT INTO work_shift_templates(id,user_id,name,week_start,shifts)
    SELECT ?,?,?,?,json_group_array(json_object('id',s.id,'employee',s.employee_id,'start',s.start_at,
      'end',s.end_at,'role',s.role,'location',s.location,'notes',s.notes))
    FROM work_shifts s JOIN employees e ON e.id=s.employee_id AND e.user_id=s.user_id AND e.status='active'
    WHERE s.user_id=? AND s.start_at>=? AND s.start_at<? HAVING count(*)>0
    ON CONFLICT(user_id,name) DO NOTHING
  `,
    [id, owner, title, weekStart, owner, weekStart + 'T00:00', shiftDay(weekStart, 7) + 'T00:00']
  );
  if (!saved.changes) {
    const duplicate = await db.getFirstAsync(
      'SELECT id FROM work_shift_templates WHERE user_id=? AND name=?',
      [owner, title]
    );
    throw new Error(duplicate ? 'schedule.templateDuplicate' : 'schedule.templateEmpty');
  }
  return id;
}

export async function applyShiftTemplate(owner: number, weekStart: string, templateId: string) {
  requireWeekStart(weekStart);
  return insertAvailableShifts(
    owner,
    weekStart,
    `
    SELECT t.id || '/' || json_extract(j.value,'$.id') AS source, json_extract(j.value,'$.employee') AS employee_id,
      strftime('%Y-%m-%dT%H:%M',json_extract(j.value,'$.start'),printf('%+d days',julianday(?)-julianday(t.week_start))) AS new_start,
      strftime('%Y-%m-%dT%H:%M',json_extract(j.value,'$.end'),printf('%+d days',julianday(?)-julianday(t.week_start))) AS new_end,
      json_extract(j.value,'$.role') AS role,json_extract(j.value,'$.location') AS location,json_extract(j.value,'$.notes') AS notes
    FROM work_shift_templates t,json_each(t.shifts) AS j WHERE t.user_id=? AND t.id=?
  `,
    [weekStart, weekStart, owner, templateId]
  );
}

export async function deleteShiftTemplate(owner: number, id: string) {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM work_shift_templates WHERE user_id=? AND id=?', [owner, id]);
  if (!result.changes) throw new Error('schedule.templateMissing');
}
