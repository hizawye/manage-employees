import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { endOfMonth, parseISO, format } from 'date-fns';
import { getDatabase } from '../database';
import { AttendanceStatus, WageType } from '../models';
import { isPayrollDate } from '../utils/payrollDate';
import { toCentimes } from '../utils/money';
import { clearWageCache, calculateDailyWage, calculateHourlyWage } from './WageCalculationService';

export function periodBounds(month: string) {
  const start = month + '-01';
  if (!isPayrollDate(start)) throw new Error('periods.invalid');
  return { start, end: format(endOfMonth(parseISO(start)), 'yyyy-MM-dd') };
}
interface Period {
  id: string;
  closed_at: string;
  reviewed_exceptions: number;
}
export type PeriodIssue = {
  employeeId: string;
  employeeName: string;
  date: string;
  reason: 'openPunch' | 'unposted' | 'missing';
};
export type PeriodEmployee = {
  id: string;
  name: string;
  days: number;
  hours: number;
  earned: number;
};
export type PeriodReview = {
  month: string;
  period: Period | null;
  employees: PeriodEmployee[];
  issues: PeriodIssue[];
  fingerprint: string;
};

async function review(db: SQLiteDatabase, owner: number, month: string): Promise<PeriodReview> {
  const { start, end } = periodBounds(month);
  const [period, staff, days, adjustments, scheduled, clocks, payees] = await Promise.all([
    db.getFirstAsync<Period>(
      'SELECT id,closed_at,reviewed_exceptions FROM pay_periods WHERE user_id=? AND month=?',
      [owner, month]
    ),
    db.getAllAsync<{ id: string; name: string; wage_type: WageType; wage_rate: number }>(
      `SELECT e.id,e.name,COALESCE(r.wage_type,e.wage_type) AS wage_type,COALESCE(r.wage_rate,e.wage_rate) AS wage_rate
      FROM employees e LEFT JOIN pay_period_rates r ON r.user_id=e.user_id AND r.month=? AND r.employee_id=e.id WHERE e.user_id=? ORDER BY e.id`,
      [month, owner]
    ),
    db.getAllAsync<{
      employee_id: string;
      date: string;
      status: AttendanceStatus;
      hours_worked: number | null;
    }>(
      `SELECT employee_id,date,status,hours_worked FROM attendance WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY employee_id,date`,
      [owner, start, end]
    ),
    db.getAllAsync<{ employee_id: string; date: string; amount: number }>(
      `SELECT employee_id,date,amount FROM wage_adjustments WHERE user_id=? AND date BETWEEN ? AND ? ORDER BY employee_id,date`,
      [owner, start, end]
    ),
    db.getAllAsync<{ employee_id: string; date: string }>(
      `SELECT DISTINCT employee_id,substr(start_at,1,10) AS date FROM work_shifts WHERE user_id=? AND substr(start_at,1,10) BETWEEN ? AND ? ORDER BY employee_id,date`,
      [owner, start, end]
    ),
    db.getAllAsync<{ employee_id: string; date: string; open: number; worked: number }>(
      `WITH RECURSIVE calendar(day) AS (
      VALUES(?) UNION ALL SELECT date(day,'+1 day') FROM calendar WHERE day<?
    ), bounds AS (SELECT day,1000*unixepoch(day,'utc') AS lo,1000*unixepoch(day,'+1 day','utc') AS hi FROM calendar),
    segments AS (SELECT c.id,c.employee_id,day,MAX(c.started_at,lo) AS begin,MIN(COALESCE(c.ended_at,?),hi) AS finish,c.ended_at IS NULL AS open
      FROM bounds JOIN clock_entries c ON c.started_at<hi AND COALESCE(c.ended_at,?)>lo WHERE c.user_id=?),
    work AS (SELECT employee_id,day,open,finish-begin-COALESCE((SELECT SUM(MAX(0,MIN(COALESCE(b.ended_at,finish),finish)-MAX(b.started_at,begin))) FROM clock_breaks b WHERE b.entry_id=segments.id AND b.paid=0),0) AS duration FROM segments)
    SELECT employee_id,day AS date,MAX(open) AS open,SUM(duration) AS worked FROM work GROUP BY employee_id,day ORDER BY employee_id,day`,
      [start, end, Date.now(), Date.now(), owner]
    ),
    db.getAllAsync<{ employee_id: string }>(
      `SELECT DISTINCT employee_id FROM payments WHERE user_id=? AND period_start<=? AND period_end>=? ORDER BY employee_id`,
      [owner, end, start]
    ),
  ]);
  const people = new Map(staff.map((e) => [e.id, e]));
  const active = new Set(
    [...days, ...adjustments, ...scheduled, ...clocks, ...payees].map((row) => row.employee_id)
  );
  const employees = staff
    .filter((e) => active.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, days: 0, hours: 0, earned: 0 }));
  const summary = new Map(employees.map((e) => [e.id, e]));
  const marked = new Map(days.map((d) => [`${d.employee_id}/${d.date}`, d]));
  for (const d of days) {
    const person = people.get(d.employee_id);
    const row = summary.get(d.employee_id);
    if (!person || !row) continue;
    row.days++;
    const hours =
      person.wage_type === WageType.HOURLY && d.status !== AttendanceStatus.ABSENT
        ? (d.hours_worked ?? 0)
        : 0;
    row.hours += hours;
    row.earned += toCentimes(
      person.wage_type === WageType.HOURLY
        ? calculateHourlyWage(person.wage_rate, hours)
        : calculateDailyWage(person.wage_rate, d.status)
    );
  }
  for (const adjustment of adjustments) {
    const row = summary.get(adjustment.employee_id);
    if (row) row.earned += toCentimes(adjustment.amount);
  }
  const issues: PeriodIssue[] = [];
  const clockDays = new Set(clocks.map((c) => `${c.employee_id}/${c.date}`));
  for (const c of clocks) {
    const person = people.get(c.employee_id);
    if (!person) continue;
    const record = marked.get(`${c.employee_id}/${c.date}`);
    const unmatched =
      c.worked > 0 &&
      (!record ||
        record.status === AttendanceStatus.ABSENT ||
        (person.wage_type === WageType.HOURLY &&
          Math.abs((record.hours_worked ?? 0) * 3600000 - c.worked) > 1));
    if (c.open || unmatched)
      issues.push({
        employeeId: person.id,
        employeeName: person.name,
        date: c.date,
        reason: c.open ? 'openPunch' : 'unposted',
      });
  }
  for (const s of scheduled) {
    const person = people.get(s.employee_id);
    const key = `${s.employee_id}/${s.date}`;
    if (person && !marked.has(key) && !clockDays.has(key))
      issues.push({
        employeeId: person.id,
        employeeName: person.name,
        date: s.date,
        reason: 'missing',
      });
  }
  issues.sort((a, b) => a.date.localeCompare(b.date) || a.employeeId.localeCompare(b.employeeId));
  const fingerprint = JSON.stringify([
    owner,
    month,
    employees,
    issues,
    days,
    adjustments,
    staff.filter((e) => active.has(e.id)).map((e) => [e.id, e.wage_rate, e.wage_type]),
  ]);
  for (const row of employees) row.earned /= 100;
  return { month, period, employees, issues, fingerprint };
}

export async function getPayPeriodReview(owner: number, month: string) {
  return review(await getDatabase(), owner, month);
}
export async function closePayPeriod(owner: number, seen: PeriodReview, acceptExceptions = false) {
  if (periodBounds(seen.month).end >= format(new Date(), 'yyyy-MM-dd'))
    throw new Error('periods.future');
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const current = await review(txn, owner, seen.month);
    if (current.period) return;
    if (current.fingerprint !== seen.fingerprint) throw new Error('periods.changed');
    if (current.issues.some((i) => i.reason === 'openPunch')) throw new Error('periods.unfinished');
    if (current.issues.length && !acceptExceptions) throw new Error('periods.reviewFirst');
    const id = randomUUID();
    await txn.runAsync(
      'INSERT INTO pay_periods(id,user_id,month,closed_at,reviewed_exceptions) VALUES(?,?,?,?,?)',
      [id, owner, seen.month, new Date().toISOString(), current.issues.length]
    );
    for (const employee of current.employees) {
      await txn.runAsync(
        `INSERT INTO pay_period_rates(user_id,month,employee_id,wage_type,wage_rate) SELECT user_id,?,id,wage_type,wage_rate FROM employees WHERE user_id=? AND id=? ON CONFLICT(user_id,month,employee_id) DO NOTHING`,
        [seen.month, owner, employee.id]
      );
    }
  });
  clearWageCache();
}
export async function reopenPayPeriod(owner: number, month: string, id: string) {
  periodBounds(month);
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    const current = await txn.getFirstAsync<{ id: string }>(
      'SELECT id FROM pay_periods WHERE user_id=? AND month=?',
      [owner, month]
    );
    if (!current) return;
    if (current.id !== id) throw new Error('periods.changed');
    await txn.runAsync('DELETE FROM pay_periods WHERE id=? AND user_id=? AND month=?', [
      id,
      owner,
      month,
    ]);
  });
  clearWageCache();
}
