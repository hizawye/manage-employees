import { addDays, format } from 'date-fns';
import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { createEmployee } from '../../src/database/repositories/EmployeeRepository';
import { EmployeeStatus, WageType } from '../../src/models';
import { openTestDatabase } from '../../test-utils/sqlite';
import { loadReport, validReportRange } from '../../src/workforce/reports';
import {
  calendarText,
  csvText,
  printableReport,
} from '../../src/workforce/fileFormats';
import { getWorkOverview } from '../../src/workforce/overview';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../../src/i18n', () => ({ t: (k: string) => k }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.requireActual('crypto').randomUUID,
}));

it('exports scoped source records and reconciles earnings separately from payments issued', async () => {
  const db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  try {
    for (const m of migrations) await m.up(db);
    await db.execAsync(
      "INSERT INTO users(id,username,is_guest,created_at) VALUES (31,'a',1,'2026-01-01'),(32,'b',1,'2026-01-01');"
    );
    const person = (owner: number, name: string) =>
      createEmployee(owner, {
        name,
        phone: '01',
        role: 'Desk',
        status: EmployeeStatus.ACTIVE,
        wageType: WageType.HOURLY,
        wageRate: 100,
        joinDate: '2026-01-01',
      });
    const a = await person(31, 'أحمد');
    const b = await person(32, 'Other');
    await db.runAsync(
      "INSERT INTO attendance(id,employee_id,user_id,date,status,hours_worked,created_at,updated_at) VALUES ('w',?,31,'2026-02-06','half_day',2.5,'','')",
      [a.id]
    );
    await db.runAsync(
      "INSERT INTO wage_adjustments(id,user_id,employee_id,date,amount,created_at,updated_at) VALUES ('a',31,?,'2026-02-06',25.25,'',''),('b',31,?,'2026-02-07',-5,'','')",
      [a.id, a.id]
    );
    await db.runAsync(
      "INSERT INTO payments(id,user_id,employee_id,amount,period_start,period_end,payment_date,created_at) VALUES ('p',31,?,180,'2026-01-01','2026-01-31','2026-02-06','')",
      [a.id]
    );
    await db.runAsync(
      "INSERT INTO work_shifts(id,user_id,employee_id,start_at,end_at,role) VALUES ('x',31,?,'2026-02-05T22:00','2026-02-06T02:00','Guard'),('y',31,?,'2026-02-07T08:00','2026-02-07T12:00','Desk')",
      [a.id, a.id]
    );
    const data = await loadReport(31, 'payroll', '2026-02-01', '2026-02-28');
    expect(data.rows).toEqual([
      [a.name, 'Desk', 0, 1, 0, 2.5, 20.25, 270.25, 180],
    ]);
    expect(
      (await loadReport(31, 'attendance', '2026-02-01', '2026-02-28')).rows
    ).toEqual([
      [a.name, '2026-02-06', 'attendance.halfDay', 2.5, 25.25, 275.25],
      [a.name, '2026-02-07', 'wages.unmarked', '', -5, -5],
    ]);
    expect(
      (await loadReport(31, 'shifts', '2026-02-06', '2026-02-06')).events?.map(
        (s) => s.id
      )
    ).toEqual(['x']);
    expect(
      (await loadReport(31, 'payroll', '2026-02-01', '2026-02-28', b.id)).rows
    ).toEqual([]);
    expect(
      await getWorkOverview(31, '2026-02-07', '2026-02-07T13:00')
    ).toMatchObject({ shifts: 1, unchecked: 1 });
    expect(
      await getWorkOverview(32, '2026-02-07', '2026-02-07T13:00')
    ).toMatchObject({ shifts: 0, unchecked: 0 });
    const start = +new Date(2026, 1, 10, 8);
    const hour = 3600000;
    await db.runAsync(
      "INSERT INTO clock_entries(id,user_id,employee_id,started_at,ended_at) VALUES('fixture',31,?,?,?)",
      [a.id, start, start + 8 * hour]
    );
    await db.runAsync(
      "INSERT INTO clock_breaks(id,entry_id,started_at,ended_at,paid) VALUES('lunch','fixture',?,?,0),('rest','fixture',?,?,1)",
      [start + hour, start + hour * 1.5, start + hour * 3, start + hour * 3.25]
    );
    const clock = await loadReport(31, 'punches', '2026-02-10', '2026-02-10');
    expect(clock.rows[0].slice(-3)).toEqual([450, 30, 15]);
    const overnight = +new Date(2026, 0, 31, 22);
    await db.runAsync(
      "INSERT INTO clock_entries(id,user_id,employee_id,started_at,ended_at) VALUES('night',31,?,?,?)",
      [a.id, overnight, overnight + 8 * hour]
    );
    await db.runAsync(
      "INSERT INTO clock_breaks(id,entry_id,started_at,ended_at,paid) VALUES('midnight','night',?,?,0)",
      [overnight + 1.5 * hour, overnight + 2.5 * hour]
    );
    const jan = await loadReport(31, 'punches', '2026-01-31', '2026-01-31');
    const feb = await loadReport(31, 'punches', '2026-02-01', '2026-02-01');
    expect(jan.rows[0].slice(-3)).toEqual([90, 30, 0]);
    expect(feb.rows[0].slice(-3)).toEqual([330, 30, 0]);
  } finally {
    await db.closeAsync();
  }
});

it('escapes spreadsheet formulas, printable text and multiline calendar notes', () => {
  expect(csvText([[' =DANGER', 'أ,ب', 'one"two', -2]])).toContain(
    '"\' =DANGER","أ,ب","one""two",-2'
  );
  const pdf = printableReport(
    '<demo>',
    'month',
    ['<name>'],
    [['<script>']],
    true
  );
  expect(pdf).toContain('dir="rtl"');
  expect(pdf).toContain('&lt;script&gt;');
  expect(pdf).not.toContain('<script>');
  const ics = calendarText([
    {
      id: 'unique',
      employee: 'اب'.repeat(80),
      start: '2026-02-10T22:00',
      end: '2026-02-11T01:00',
      role: 'Desk',
      location: 'A,B',
      notes: 'n\nnext;',
    },
  ]);
  expect(ics).toContain('DTEND:20260211T010000');
  expect(ics).toContain('DESCRIPTION:n\\nnext\\;');
  expect(ics).toContain('LOCATION:A\\,B');
  for (const line of ics.split('\r\n'))
    expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  expect(validReportRange('2026-02-30', '2026-03-02')).toBe(false);
  expect(
    validReportRange(
      '2024-01-01',
      format(addDays(new Date(2024, 0, 1), 366), 'yyyy-MM-dd')
    )
  ).toBe(false);
});
