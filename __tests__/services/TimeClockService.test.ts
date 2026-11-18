import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { payPeriodsMigration } from '../../src/database/migrations/014_pay_periods';
import { timeClockMigration } from '../../src/database/migrations/012_time_clock';
import { createEmployee, getAttendanceByEmployeeAndDate } from '../../src/database/repositories';
import { AttendanceStatus, Employee, EmployeeStatus, WageType } from '../../src/models';
import { AttendanceService } from '../../src/services/AttendanceService';
import { calculateWagesForPeriod } from '../../src/services/WageCalculationService';
import {
  clockIn,
  clockOut,
  endClockBreak,
  startClockBreak,
  getClockDays,
  closedWorkMs,
  postClockAttendance,
} from '../../src/services/TimeClockService';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('../../src/i18n', () => ({ t: (key: string) => key }));

const at = (time: string) => new Date(time).getTime();
const firstDay = '2026-04-30';
const secondDay = '2026-05-01';
const owner = 20;
const other = 21;
const hour = 3600000;

describe('durable time clock with migrated SQLite', () => {
  let db: SQLiteDatabase;
  let employee: Employee;
  const read = async (id: string, date: string) =>
    (await getClockDays(owner, date)).find((day) => day.id === id)!;
  const add = (who: number, wageType: WageType) =>
    createEmployee(who, {
      name: `Worker ${who}`,
      phone: '1000',
      role: 'Reception',
      wageType,
      wageRate: 180,
      status: EmployeeStatus.ACTIVE,
      joinDate: '2026-01-01',
    });
  beforeEach(async () => {
    db = openTestDatabase();
    jest.mocked(getDatabase).mockResolvedValue(db);
    for (const migration of migrations.filter((step) => step.version <= 9)) await migration.up(db);
    await timeClockMigration.up(db);
    await payPeriodsMigration.up(db);
    await db.execAsync(
      "INSERT INTO users(id,username,created_at) VALUES(20,'time_first','2026-01-01'),(21,'time_second','2026-01-01')"
    );
    employee = await add(owner, WageType.HOURLY);
  });
  afterEach(async () => {
    await db.closeAsync();
  });

  it('retains live punches, ends an open break on clock-out and makes action replays harmless', async () => {
    const start = at(`${firstDay}T09:00:00`);
    await clockIn(owner, employee.id, 'a', start);
    await clockIn(owner, employee.id, 'a', start);
    await expect(clockIn(owner, employee.id, 'b', start)).rejects.toThrow('changed');
    await startClockBreak(owner, 'a', true, 'first-break', start + hour);
    await startClockBreak(owner, 'a', true, 'first-break', start + hour);
    await expect(startClockBreak(owner, 'a', false, 'extra-break', start + hour)).rejects.toThrow(
      'changed'
    );
    await endClockBreak(owner, 'first-break', start + 1.25 * hour);
    await endClockBreak(owner, 'first-break', start + 1.5 * hour);
    await startClockBreak(owner, 'a', false, 'second-break', start + 2 * hour);
    const open = await read(employee.id, firstDay);
    expect(open.active?.breaks[1]).toMatchObject({ paid: false, end: null });
    await expect(clockOut(owner, 'a', start + hour)).rejects.toThrow('changed');
    await clockOut(owner, 'a', start + 3 * hour);
    await clockOut(owner, 'a', start + 4 * hour);
    await clockIn(owner, employee.id, 'a', start);
    const closed = await read(employee.id, firstDay);
    expect(closed.active).toBeNull();
    expect(closed.entries[0].breaks[1].end).toBe(start + 3 * hour);
    expect(closedWorkMs(closed)).toBe(2 * hour);
    const logs = await db.getAllAsync<{ action: string }>(
      "SELECT action FROM logs WHERE entity_type='workforce' AND user_id=?",
      [owner]
    );
    expect(logs.map((row) => row.action).sort()).toEqual(
      [
        'clock_in',
        'clock_break_start',
        'clock_break_end',
        'clock_break_start',
        'clock_break_end',
        'clock_out',
      ].sort()
    );
  });

  it('splits overnight pay and unpaid breaks at midnight, totals multiple shifts, and reconciles actual monthly wages', async () => {
    await clockIn(owner, employee.id, 'night', at(`${firstDay}T21:30:00`));
    await startClockBreak(owner, 'night', false, 'dinner', at(`${firstDay}T23:30:00`));
    await endClockBreak(owner, 'dinner', at(`${secondDay}T00:30:00`));
    await clockOut(owner, 'night', at(`${secondDay}T03:00:00`));
    await clockIn(owner, employee.id, 'day', at(`${secondDay}T09:00:00`));
    await clockOut(owner, 'day', at(`${secondDay}T10:00:00`));
    const april = await read(employee.id, firstDay);
    const may = await read(employee.id, secondDay);
    expect(closedWorkMs(april)).toBe(2 * hour);
    expect(closedWorkMs(may)).toBe(3.5 * hour);
    expect(await getAttendanceByEmployeeAndDate(owner, employee.id, firstDay)).toBeNull();
    expect((await calculateWagesForPeriod(owner, employee, firstDay, secondDay)).totalWage).toBe(0);
    await postClockAttendance(owner, april, AttendanceStatus.PRESENT);
    await postClockAttendance(owner, may, AttendanceStatus.PRESENT);
    await postClockAttendance(owner, may, AttendanceStatus.PRESENT);
    expect((await calculateWagesForPeriod(owner, employee, firstDay, secondDay)).totalWage).toBe(
      990
    );
    expect(
      await db.getFirstAsync("SELECT COUNT(*) AS records FROM logs WHERE action='clock_attendance'")
    ).toEqual({ records: 2 });
  });

  it('keeps manual data until reviewed, rejects stale previews and keeps manual notes', async () => {
    await clockIn(owner, employee.id, 'manual', at(`${firstDay}T08:00:00`));
    await clockOut(owner, 'manual', at(`${firstDay}T13:00:00`));
    const empty = await read(employee.id, firstDay);
    await AttendanceService.markAttendance(owner, {
      employeeId: employee.id,
      date: firstDay,
      status: AttendanceStatus.ABSENT,
      notes: 'Call manager',
    });
    await expect(postClockAttendance(owner, empty, AttendanceStatus.PRESENT)).rejects.toThrow(
      'changed'
    );
    const manual = await read(employee.id, firstDay);
    expect(manual.attendanceStatus).toBe(AttendanceStatus.ABSENT);
    await postClockAttendance(owner, manual, AttendanceStatus.PRESENT);
    expect(await getAttendanceByEmployeeAndDate(owner, employee.id, firstDay)).toMatchObject({
      hoursWorked: 5,
      notes: 'Call manager',
    });
    await clockIn(owner, employee.id, 'later', at(`${firstDay}T14:00:00`));
    await expect(postClockAttendance(owner, manual, AttendanceStatus.PRESENT)).rejects.toThrow(
      'changed'
    );
    await clockOut(owner, 'later', at(`${firstDay}T15:00:00`));
    await expect(postClockAttendance(owner, manual, AttendanceStatus.PRESENT)).rejects.toThrow(
      'changed'
    );
  });

  it('isolates owners, lets a deactivated worker finish and retains their punches for review', async () => {
    const stranger = await add(other, WageType.DAILY);
    await expect(clockIn(owner, stranger.id, 'wrong')).rejects.toThrow('changed');
    const start = at(`${firstDay}T08:00:00`);
    await clockIn(owner, employee.id, 'owned', start);
    await expect(startClockBreak(other, 'owned', true, 'fake', start)).rejects.toThrow('changed');
    await startClockBreak(owner, 'owned', false, 'meal', start + hour);
    await expect(endClockBreak(other, 'meal', start + 2 * hour)).rejects.toThrow('changed');
    await expect(clockOut(other, 'owned', start + 2 * hour)).rejects.toThrow('changed');
    expect(await getClockDays(other, firstDay)).toHaveLength(1);
    await db.runAsync("UPDATE employees SET status='inactive' WHERE id=?", [employee.id]);
    await clockOut(owner, 'owned', start + 2 * hour);
    const day = await read(employee.id, firstDay);
    await expect(postClockAttendance(other, day, AttendanceStatus.PRESENT)).rejects.toThrow(
      'changed'
    );
    await postClockAttendance(owner, day, AttendanceStatus.PRESENT);
    await expect(clockIn(owner, employee.id, 'again', start + 3 * hour)).rejects.toThrow('changed');
  });

  it('requires a daily rate decision and applies half-day wages only once across split shifts', async () => {
    const daily = await add(owner, WageType.DAILY);
    const start = at(`${firstDay}T08:00:00`);
    for (const [id, offset] of [
      ['am', 0],
      ['pm', 4],
    ] as const) {
      await clockIn(owner, daily.id, id, start + offset * hour);
      await clockOut(owner, id, start + (offset + 1) * hour);
    }
    const day = await read(daily.id, firstDay);
    await postClockAttendance(owner, day, AttendanceStatus.HALF_DAY);
    await postClockAttendance(owner, day, AttendanceStatus.HALF_DAY);
    expect(await getAttendanceByEmployeeAndDate(owner, daily.id, firstDay)).toMatchObject({
      status: AttendanceStatus.HALF_DAY,
    });
    expect((await calculateWagesForPeriod(owner, daily, firstDay, firstDay)).totalWage).toBe(90);
  });
});
