import { addDays, format, parseISO } from 'date-fns';
import {
  getFrozenWageRates,
  wageTermsForDate,
} from '../database/repositories/FrozenWageRepository';
import { getDatabase } from '../database';
import {
  getAllEmployees,
  getAttendanceInRange,
} from '../database/repositories';
import { calculateWageForDay } from '../services/WageCalculationService';
import { toCentimes } from '../utils/money';
import { isPayrollDate } from '../utils/payrollDate';
import { t } from '../i18n';
import type { hubEn } from '../i18n/workforce/hub';

export const reportKinds = [
  'payroll',
  'attendance',
  'shifts',
  'timeOff',
  'punches',
] as const;
export type ReportKind = (typeof reportKinds)[number];
export type Cell = string | number;
type Column = keyof typeof hubEn.headers;
export type CalendarShift = {
  id: string;
  employee: string;
  start: string;
  end: string;
  role: string;
  location: string;
  notes: string;
};
export type WorkforceReport = {
  columns: Column[];
  rows: Cell[][];
  events?: CalendarShift[];
};

export function validReportRange(start: string, end: string) {
  return (
    isPayrollDate(start) &&
    isPayrollDate(end) &&
    start <= end &&
    Date.parse(end) - Date.parse(start) <= 365 * 86400000
  );
}

// The work-date ledger and the payment-date ledger intentionally have separate columns.
export async function loadReport(
  owner: number,
  kind: ReportKind,
  start: string,
  end: string,
  employeeId?: string
): Promise<WorkforceReport> {
  if (!validReportRange(start, end)) throw new Error('work.rangeError');
  const db = await getDatabase();
  const after = format(addDays(parseISO(end), 1), 'yyyy-MM-dd');
  const employeeMatch = employeeId ? ' AND e.id = ?' : '';
  const params = (from: string | number, until: string | number) =>
    employeeId ? [owner, from, until, employeeId] : [owner, from, until];
  if (kind === 'shifts') {
    const events = await db.getAllAsync<CalendarShift>(
      `SELECT s.id,e.name AS employee,s.start_at AS start,s.end_at AS end,s.role,s.location,s.notes
      FROM work_shifts s JOIN employees e ON e.id=s.employee_id AND e.user_id=s.user_id
      WHERE s.user_id=? AND s.end_at>? AND s.start_at<? ${employeeMatch} ORDER BY s.start_at,e.name,s.id`,
      params(start + 'T00:00', after + 'T00:00')
    );
    return {
      columns: ['employee', 'role', 'start', 'end', 'location', 'notes'],
      events,
      rows: events.map((s) => [
        s.employee,
        s.role || '',
        s.start,
        s.end,
        s.location || '',
        s.notes || '',
      ]),
    };
  }
  if (kind === 'timeOff') {
    const items = await db.getAllAsync<{
      name: string;
      start_date: string;
      end_date: string;
      type: string;
      status: string;
    }>(
      `SELECT e.name,r.start_date,r.end_date,r.type,r.status
      FROM time_off_requests r JOIN employees e ON e.id=r.employee_id AND e.user_id=r.user_id
      WHERE r.user_id=? AND r.end_date>=? AND r.start_date<=? ${employeeMatch} ORDER BY r.start_date,e.name,r.id`,
      params(start, end)
    );
    return {
      columns: ['employee', 'start', 'end', 'type', 'status'],
      rows: items.map((r) => [
        r.name,
        r.start_date,
        r.end_date,
        t('leave.type.' + r.type),
        t('leave.status.' + r.status),
      ]),
    };
  }
  if (kind === 'punches') {
    const items = await db.getAllAsync<{
      name: string;
      started_at: number;
      ended_at: number | null;
      unpaid: number;
      paid: number;
    }>(
      `WITH bounds(lo,hi,now) AS (VALUES (?,?,?)), overlaps AS (
        SELECT c.id,e.name,max(c.started_at,lo) AS started_at,min(c.ended_at,hi) AS ended_at,
          b.paid,max(0,min(coalesce(b.ended_at,bounds.now),hi)-max(b.started_at,lo)) AS break_ms
        FROM clock_entries c JOIN employees e ON e.id=c.employee_id AND e.user_id=c.user_id
        CROSS JOIN bounds LEFT JOIN clock_breaks b ON b.entry_id=c.id
        WHERE c.user_id=? AND c.started_at<hi AND coalesce(c.ended_at,bounds.now)>lo ${employeeMatch}
      ) SELECT name,started_at,ended_at, sum(CASE WHEN paid=0 THEN break_ms ELSE 0 END) AS unpaid,
        sum(CASE WHEN paid=1 THEN break_ms ELSE 0 END) AS paid
        FROM overlaps GROUP BY id ORDER BY started_at,name,id`,
      [
        +parseISO(start),
        +parseISO(after),
        Date.now(),
        owner,
        ...(employeeId ? [employeeId] : []),
      ]
    );
    const time = (ms: number) => format(new Date(ms), 'yyyy-MM-dd HH:mm');
    return {
      columns: ['employee', 'start', 'end', 'net', 'unpaid', 'paid'],
      rows: items.map((r) => [
        r.name,
        time(r.started_at),
        r.ended_at === null ? '' : time(r.ended_at),
        r.ended_at === null
          ? ''
          : Math.round((r.ended_at - r.started_at - r.unpaid) / 600) / 100,
        Math.round(r.unpaid / 600) / 100,
        Math.round(r.paid / 600) / 100,
      ]),
    };
  }
  const [roster, attendance, frozenRates, adjustments, payments] =
    await Promise.all([
      getAllEmployees(owner),
      getAttendanceInRange(owner, start, end),
      getFrozenWageRates(owner, start, end, employeeId),
      db.getAllAsync<{ employee_id: string; date: string; amount: number }>(
        `SELECT a.employee_id,a.date,a.amount FROM wage_adjustments a JOIN employees e ON e.id=a.employee_id AND e.user_id=a.user_id
      WHERE a.user_id=? AND a.date>=? AND a.date<=? ${employeeMatch}`,
        params(start, end)
      ),
      kind === 'payroll'
        ? db.getAllAsync<{ employee_id: string; amount: number }>(
            `SELECT p.employee_id,p.amount FROM payments p JOIN employees e ON e.id=p.employee_id AND e.user_id=p.user_id
      WHERE p.user_id=? AND p.payment_date>=? AND p.payment_date<=? ${employeeMatch}`,
            params(start, end)
          )
        : [],
    ]);
  const people = roster.filter((e) => !employeeId || employeeId === e.id);
  const summary = new Map(
    people.map((e) => [
      e.id,
      {
        employee: e,
        hourly: wageTermsForDate(frozenRates, e, start).wageType === 'hourly',
        hours: 0,
        earned: 0,
        adjustment: 0,
        paid: 0,
        present: 0,
        half_day: 0,
        absent: 0,
      },
    ])
  );
  const details = new Map<
    string,
    {
      date: string;
      name: string;
      status: string;
      hours: Cell;
      earned: number;
      adjustment: number;
    }
  >();
  for (const a of attendance) {
    const s = summary.get(a.employeeId);
    if (!s) continue;
    const terms = wageTermsForDate(frozenRates, s.employee, a.date);
    if (terms.wageType === 'hourly') s.hourly = true;
    const earned = toCentimes(
      calculateWageForDay({ ...s.employee, ...terms }, a)
    );
    const hours =
      terms.wageType === 'hourly'
        ? a.status === 'absent'
          ? 0
          : (a.hoursWorked ?? 0)
        : '';
    s.hours += Number(hours);
    s.earned += earned;
    s[a.status]++;
    details.set(`${a.employeeId}/${a.date}`, {
      date: a.date,
      name: s.employee.name,
      status: t(`attendance.${a.status === 'half_day' ? 'halfDay' : a.status}`),
      hours,
      earned,
      adjustment: 0,
    });
  }
  for (const a of adjustments) {
    const s = summary.get(a.employee_id);
    if (!s) continue;
    const amount = toCentimes(a.amount);
    s.adjustment += amount;
    const key = `${a.employee_id}/${a.date}`;
    const row = details.get(key) ?? {
      date: a.date,
      name: s.employee.name,
      status: t('wages.unmarked'),
      hours: '',
      earned: 0,
      adjustment: 0,
    };
    row.adjustment += amount;
    details.set(key, row);
  }
  if (kind === 'attendance') {
    const ordered = Array.from(details.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)
    );
    return {
      columns: [
        'employee',
        'date',
        'status',
        'hours',
        'adjustment',
        'earnings',
      ],
      rows: ordered.map((r) => [
        r.name,
        r.date,
        r.status,
        r.hours,
        r.adjustment / 100,
        (r.earned + r.adjustment) / 100,
      ]),
    };
  }
  for (const p of payments) {
    const s = summary.get(p.employee_id);
    if (s) s.paid += toCentimes(p.amount);
  }
  return {
    columns: [
      'employee',
      'role',
      'present',
      'half',
      'absent',
      'hours',
      'adjustment',
      'earnings',
      'payments',
    ],
    rows: Array.from(summary.values()).map((s) => [
      s.employee.name,
      s.employee.role,
      s.present,
      s.half_day,
      s.absent,
      s.hourly ? Number(s.hours.toFixed(4)) : '',
      s.adjustment / 100,
      (s.earned + s.adjustment) / 100,
      s.paid / 100,
    ]),
  };
}
