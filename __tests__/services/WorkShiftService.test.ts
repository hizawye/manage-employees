import { availabilityMigration } from '../../src/database/migrations/015_availability';
import {
  saveUnavailable,
  deleteUnavailable,
  listUnavailable,
  eligibleStaff,
  type AvailabilityInput,
} from '../../src/services/AvailabilityService';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { workShiftsMigration } from '../../src/database/migrations/010_work_shifts';
import { timeOffMigration } from '../../src/database/migrations/011_time_off';
import { requestTimeOff, decideTimeOff } from '../../src/services/TimeOffService';
import { shiftTemplatesMigration } from '../../src/database/migrations/013_shift_templates';
import {
  applyShiftTemplate,
  saveShiftTemplate,
  deleteShiftTemplate,
  listShiftTemplates,
  copyPreviousWeek,
  deleteWorkShift,
  getShiftsInRange,
  normalizeShiftTime,
  saveWorkShift,
  type ShiftDraft,
} from '../../src/services/WorkShiftService';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.requireActual('crypto').randomUUID }));

const base: ShiftDraft = {
  employeeId: 'worker',
  date: '2026-11-16',
  startTime: '09:00',
  endTime: '17:00',
  role: 'Clerk',
  location: 'East',
  notes: 'Morning delivery',
};
let db: SQLiteDatabase;
beforeEach(async () => {
  db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  for (const step of migrations.filter((step) => step.version < 10)) await step.up(db);
  await workShiftsMigration.up(db);
  await availabilityMigration.up(db);
  await db.execAsync(`
    INSERT INTO users (id, username, created_at) VALUES (31,'a',''), (42,'b','');
    INSERT INTO employees (id,user_id,name,phone,role,wage_type,wage_rate,join_date,status,created_at,updated_at)
      VALUES ('worker',31,'One','','Clerk','daily',10,'2026-01-01','active','',''),
      ('second',31,'Two','','Clerk','daily',10,'2026-01-01','active','',''),
      ('foreign',42,'Foreign','','Clerk','daily',10,'2026-01-01','active','','');
  `);
});
afterEach(async () => {
  await db.closeAsync();
});

it('keeps local overnight boundaries, blocks overlaps and accepts adjacent shifts', async () => {
  const night = { ...base, date: '2026-11-15', startTime: '٢٢:٠٠', endTime: '۰۶:۳۰' };
  const id = await saveWorkShift(31, night);
  expect(await getShiftsInRange(31, base.date, base.date)).toHaveLength(0);
  expect(await getShiftsInRange(31, base.date, base.date, true)).toEqual([
    expect.objectContaining({
      id,
      startAt: '2026-11-15T22:00',
      endAt: '2026-11-16T06:30',
    }),
  ]);
  await expect(saveWorkShift(31, { ...base, startTime: '06:29' })).rejects.toThrow('schedule.overlap');
  await saveWorkShift(31, { ...base, startTime: '6:30' });
  await expect(saveWorkShift(31, { ...night, endTime: '07:00' }, id)).rejects.toThrow('schedule.overlap');
  await expect(saveWorkShift(31, { ...base, endTime: '09:00' })).rejects.toThrow('schedule.sameTime');
  expect(() => normalizeShiftTime('24:30')).toThrow('schedule.invalidTime');
  await expect(saveWorkShift(31, { ...base, date: '2026-02-30' })).rejects.toThrow('schedule.invalidDate');
});

it('requires employee ownership, preserves inactive history, and audits committed edits and deletes', async () => {
  const id = await saveWorkShift(31, base);
  await expect(saveWorkShift(31, { ...base, employeeId: 'foreign' })).rejects.toThrow('schedule.inactive');
  await expect(saveWorkShift(42, { ...base, employeeId: 'foreign' }, id)).rejects.toThrow('schedule.missing');
  await expect(deleteWorkShift(42, id)).rejects.toThrow('schedule.missing');
  expect(await getShiftsInRange(42, base.date, base.date)).toEqual([]);
  await saveWorkShift(31, { ...base, notes: 'Changed' }, id);
  await db.runAsync("UPDATE employees SET status='inactive' WHERE id='worker'");
  expect(await getShiftsInRange(31, base.date, base.date)).toEqual([
    expect.objectContaining({ notes: 'Changed', employeeStatus: 'inactive' }),
  ]);
  await expect(saveWorkShift(31, base, id)).rejects.toThrow('schedule.inactive');
  expect(await copyPreviousWeek(31, '2026-11-23')).toBe(0);
  await deleteWorkShift(31, id);
  const events = await db.getAllAsync<{ action: string }>(
    "SELECT action FROM logs WHERE entity_type='workforce' ORDER BY rowid"
  );
  expect(events.map((e) => e.action)).toEqual(['shift_created', 'shift_updated', 'shift_deleted']);
});

it('copies only the previous week and skips existing bookings, approved leave and already edited copies', async () => {
  await timeOffMigration.up(db);
  const leave = await requestTimeOff(31, {
    employeeId: 'second',
    startDate: '2026-11-23',
    endDate: '2026-11-23',
    type: 'vacation',
    note: '',
  });
  await decideTimeOff(31, leave, 'approved');
  await saveWorkShift(31, base);
  await saveWorkShift(31, { ...base, employeeId: 'second' });
  await saveWorkShift(31, { ...base, date: '2026-11-17' });
  await saveWorkShift(31, { ...base, date: '2026-11-24', startTime: '12:00', endTime: '13:00' });
  await expect(
    saveWorkShift(31, {
      ...base,
      employeeId: 'second',
      date: '2026-11-22',
      startTime: '22:00',
      endTime: '02:00',
    })
  ).rejects.toThrow('schedule.onLeave');
  await saveWorkShift(31, {
    ...base,
    employeeId: 'second',
    date: '2026-11-22',
    startTime: '22:00',
    endTime: '00:00',
  });
  expect(await copyPreviousWeek(31, '2026-11-23')).toBe(2);
  const following = await getShiftsInRange(31, '2026-11-23', '2026-11-29');
  expect(following).toHaveLength(3);
  const first = following.find((item) => item.startAt === '2026-11-23T09:00')!;
  expect(first).toMatchObject({ employeeId: 'worker', location: base.location, notes: base.notes });
  await saveWorkShift(31, { ...base, date: '2026-11-25', startTime: '11:00' }, first.id);
  expect(await copyPreviousWeek(31, '2026-11-23')).toBe(0);
  expect(await copyPreviousWeek(42, '2026-11-23')).toBe(0);
});

it('serializes concurrent duplicate shifts and repeat copies at the database boundary', async () => {
  const creates = await Promise.allSettled([saveWorkShift(31, base), saveWorkShift(31, base)]);
  expect(creates.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
  const copied = await Promise.all([copyPreviousWeek(31, '2026-11-23'), copyPreviousWeek(31, '2026-11-23')]);
  expect(copied.sort()).toEqual([0, 1]);
});

it('saves named week snapshots, applies them once across year boundaries and isolates template ownership', async () => {
  await shiftTemplatesMigration.up(db);
  await expect(saveShiftTemplate(31, '2026-11-16', 'Morning')).rejects.toThrow('schedule.templateEmpty');
  const original = await saveWorkShift(31, {
    ...base,
    date: '2026-11-22',
    startTime: '22:00',
    endTime: '04:00',
  });
  const template = await saveShiftTemplate(31, '2026-11-16', 'Morning');
  await expect(saveShiftTemplate(31, '2026-11-16', 'morning')).rejects.toThrow('schedule.templateDuplicate');
  expect(await listShiftTemplates(42)).toEqual([]);
  expect(await listShiftTemplates(31)).toEqual([{ id: template, name: 'Morning', count: 1 }]);
  await deleteWorkShift(31, original);
  expect(await applyShiftTemplate(42, '2026-12-28', template)).toBe(0);
  expect(await applyShiftTemplate(31, '2026-12-28', template)).toBe(1);
  const [copy] = await getShiftsInRange(31, '2026-12-28', '2027-01-03');
  expect(copy).toMatchObject({ startAt: '2027-01-03T22:00', endAt: '2027-01-04T04:00', notes: base.notes });
  await saveWorkShift(31, { ...base, date: '2027-01-02' }, copy.id);
  expect(await applyShiftTemplate(31, '2026-12-28', template)).toBe(0);
  await expect(deleteShiftTemplate(42, template)).rejects.toThrow('schedule.templateMissing');
  await deleteShiftTemplate(31, template);
  expect(await listShiftTemplates(31)).toEqual([]);
  expect(await getShiftsInRange(31, '2027-01-02', '2027-01-02')).toHaveLength(1);
});

it('handles weekly and overnight availability, effective dates, eligible replacements and owner-scoped changes', async () => {
  const rule: AvailabilityInput = {
    employeeId: 'worker',
    weekday: 0,
    effective: '2026-11-15',
    allDay: false,
    start: '٢٢:٠٠',
    end: '٠٦:٠٠',
  };
  const id = await saveUnavailable(31, rule);
  expect(await listUnavailable(42)).toEqual([]);
  await expect(saveUnavailable(42, { ...rule, employeeId: 'foreign' }, id)).rejects.toThrow(
    'schedule.missingRule'
  );
  await expect(deleteUnavailable(42, id)).rejects.toThrow('schedule.missingRule');
  await expect(saveUnavailable(31, rule)).rejects.toThrow('schedule.duplicateRule');
  expect(await eligibleStaff(31, '2026-11-16', '05:00', '06:00')).toEqual(['second']);
  expect(await eligibleStaff(31, '2026-11-16', '06:00', '07:00')).toEqual(['worker', 'second']);
  await saveWorkShift(31, { ...base, date: '2026-11-08', startTime: '23:30', endTime: '01:00' });
  const adjacent = await saveWorkShift(31, {
    ...base,
    date: '2026-11-15',
    startTime: '21:00',
    endTime: '22:00',
  });
  await expect(
    saveWorkShift(31, { ...base, date: '2026-11-16', startTime: '05:59', endTime: '07:00' })
  ).rejects.toThrow('schedule.unavailable');
  expect(await eligibleStaff(31, '2026-11-15', '21:00', '22:00', adjacent)).toEqual(['worker', 'second']);
  await expect(saveUnavailable(31, { ...rule, allDay: true }, id)).rejects.toThrow('schedule.booked');
  await deleteUnavailable(31, id);
  await saveUnavailable(31, { ...rule, allDay: true, effective: '2026-11-22' });
  await expect(
    saveWorkShift(31, { ...base, date: '2026-11-21', startTime: '23:00', endTime: '01:00' })
  ).rejects.toThrow('schedule.unavailable');
  await saveWorkShift(31, { ...base, date: '2026-11-21', startTime: '23:00', endTime: '00:00' });
});

it('skips recurring unavailability while loading a saved week or copying the preceding one', async () => {
  await shiftTemplatesMigration.up(db);
  await saveWorkShift(31, base);
  await saveWorkShift(31, { ...base, employeeId: 'second' });
  const template = await saveShiftTemplate(31, '2026-11-16', 'Work');
  await saveUnavailable(31, {
    employeeId: 'worker',
    weekday: 1,
    effective: '2026-11-23',
    start: '08:00',
    end: '12:00',
    allDay: false,
  });
  expect(await copyPreviousWeek(31, '2026-11-23')).toBe(1);
  expect(await applyShiftTemplate(31, '2026-11-30', template)).toBe(1);
  expect((await getShiftsInRange(31, '2026-11-23', '2026-12-01')).map((s) => s.employeeId)).toEqual([
    'second',
    'second',
  ]);
});
