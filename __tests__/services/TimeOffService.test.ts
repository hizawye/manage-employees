import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { workShiftsMigration } from '../../src/database/migrations/010_work_shifts';
import { timeOffMigration } from '../../src/database/migrations/011_time_off';
import { createEmployee } from '../../src/database/repositories/EmployeeRepository';
import { EmployeeStatus, WageType } from '../../src/models/Employee';
import {
  decideTimeOff,
  listTimeOff,
  requestTimeOff,
  timeOffError,
  type TimeOffInput,
} from '../../src/services/TimeOffService';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.requireActual('crypto').randomUUID,
}));

describe('whole-day leave in the shared roster', () => {
  let db: ReturnType<typeof openTestDatabase>;
  let employeeId: string;
  let teammateId: string;
  let outsiderId: string;
  const owner = 60;
  const other = 61;
  const startDate = '2028-02-29';
  const endDate = '2028-03-01';
  const create = (changes: Partial<TimeOffInput> = {}) =>
    requestTimeOff(owner, {
      employeeId,
      startDate,
      endDate,
      type: 'vacation',
      note: ' Private fixture ',
      ...changes,
    });
  const shift = (
    id: string,
    employee: string,
    start: string,
    end: string,
    account = owner
  ) =>
    db.runAsync(
      'INSERT INTO work_shifts(id,user_id,employee_id,start_at,end_at) VALUES(?,?,?,?,?)',
      [id, account, employee, start, end]
    );

  beforeEach(async () => {
    db = openTestDatabase();
    jest.mocked(getDatabase).mockResolvedValue(db);
    for (const migration of [
      ...migrations.filter((m) => m.version < 10),
      workShiftsMigration,
      timeOffMigration,
    ]) {
      await migration.up(db);
    }
    await db.execAsync(`INSERT INTO users(id,username,created_at,is_guest) VALUES
      (60,'guest_leave','2028-01-01',1),(61,'guest_elsewhere','2028-01-01',1)`);
    const employee = (account: number, name: string) =>
      createEmployee(account, {
        name,
        phone: '000',
        role: 'Tester',
        status: EmployeeStatus.ACTIVE,
        wageType: WageType.HOURLY,
        wageRate: 50,
        joinDate: '2028-01-01',
      });
    employeeId = (await employee(owner, 'ليلى')).id;
    teammateId = (await employee(owner, 'Sam')).id;
    outsiderId = (await employee(other, 'Other')).id;
  });
  afterEach(() => db.closeAsync());

  it('isolates owners, records only allowed decisions, and keeps the private note out of the audit log', async () => {
    const id = await create();
    expect(await listTimeOff(other)).toEqual([]);
    await expect(decideTimeOff(other, id, 'approved')).rejects.toThrow(
      'leave.changed'
    );
    await expect(create({ employeeId: outsiderId })).rejects.toThrow(
      'leave.unavailableEmployee'
    );
    await expect(create()).rejects.toThrow(/UNIQUE/);
    expect((await listTimeOff(owner, 'pending'))[0]).toMatchObject({
      id,
      status: 'pending',
      employeeName: 'ليلى',
      note: 'Private fixture',
    });
    await decideTimeOff(owner, id, 'approved');
    await expect(decideTimeOff(owner, id, 'declined')).rejects.toThrow(
      'leave.changed'
    );
    await decideTimeOff(owner, id, 'cancelled');
    await expect(decideTimeOff(owner, id, 'approved')).rejects.toThrow(
      'leave.changed'
    );
    const audit = await db.getAllAsync<{ action: string; details: string }>(
      'SELECT action,details FROM logs WHERE entity_id=? ORDER BY rowid',
      [id]
    );
    expect(audit.map((row) => row.action)).toEqual([
      'leave_requested',
      'leave_approved',
      'leave_cancelled',
    ]);
    expect(JSON.parse(audit[1].details)).toMatchObject({
      employeeName: 'ليلى',
      date: startDate,
      status: 'approved',
    });
    expect(audit.some((row) => row.details.includes('Private fixture'))).toBe(
      false
    );
    expect(await listTimeOff(owner, 'approved')).toEqual([]);
  });

  it('detects an existing overnight shift on approval and rejects later shift inserts and edits during approved leave', async () => {
    const id = await create();
    await shift('night', employeeId, '2028-02-28T22:00', '2028-02-29T00:01');
    await expect(decideTimeOff(owner, id, 'approved')).rejects.toThrow(
      'leave.shiftConflict'
    );
    expect((await listTimeOff(owner))[0].status).toBe('pending');
    await db.runAsync(
      "UPDATE work_shifts SET end_at='2028-02-29T00:00' WHERE id='night'"
    );
    await shift('next', employeeId, '2028-03-02T00:00', '2028-03-02T05:00');
    await shift('other', teammateId, '2028-02-29T08:00', '2028-02-29T16:00');
    await decideTimeOff(owner, id, 'approved');
    await expect(
      shift('blocked', employeeId, '2028-03-01T23:59', '2028-03-02T00:00')
    ).rejects.toThrow('schedule.onLeave');
    await expect(
      db.runAsync(
        "UPDATE work_shifts SET start_at='2028-03-01T23:59' WHERE id='next'"
      )
    ).rejects.toThrow('schedule.onLeave');
    await shift(
      'foreign',
      outsiderId,
      '2028-03-01T23:59',
      '2028-03-02T00:00',
      other
    );
    await decideTimeOff(owner, id, 'cancelled');
    await shift('open', employeeId, '2028-02-29T00:00', '2028-02-29T07:00');
  });

  it('serializes concurrent overlapping approvals and permits adjacent leave and a later cancelled date', async () => {
    const first = await create();
    const second = await create({ startDate: endDate, endDate: '2028-03-03' });
    const decisions = await Promise.allSettled(
      [first, second].map((id) => decideTimeOff(owner, id, 'approved'))
    );
    expect(
      decisions.filter((result) => result.status === 'fulfilled')
    ).toHaveLength(1);
    const blocked = decisions.find((result) => result.status === 'rejected');
    expect(blocked?.status === 'rejected' && timeOffError(blocked.reason)).toBe(
      'leave.leaveConflict'
    );
    const approved = (await listTimeOff(owner, 'approved'))[0];
    const pending = (await listTimeOff(owner, 'pending'))[0];
    const adjacent = await create({
      startDate: '2028-03-04',
      endDate: '2028-03-04',
    });
    await decideTimeOff(owner, adjacent, 'approved');
    await decideTimeOff(owner, approved.id, 'cancelled');
    await decideTimeOff(owner, pending.id, 'approved');
    expect(
      (await listTimeOff(owner, 'approved')).map((row) => row.id).sort()
    ).toEqual([adjacent, pending.id].sort());
  });

  it('validates inclusive calendar dates and preserves inactive employee history', async () => {
    await expect(create({ startDate: '2027-02-29' })).rejects.toThrow(
      'leave.invalidDates'
    );
    await expect(create({ startDate: '2028-03-02' })).rejects.toThrow(
      'leave.invalidDates'
    );
    const id = await create();
    await db.runAsync("UPDATE employees SET status='inactive' WHERE id=?", [
      employeeId,
    ]);
    await expect(decideTimeOff(owner, id, 'approved')).rejects.toThrow(
      'leave.unavailableEmployee'
    );
    await expect(create({ type: 'sick' })).rejects.toThrow(
      'leave.unavailableEmployee'
    );
    await decideTimeOff(owner, id, 'declined');
    expect((await listTimeOff(owner, 'declined'))[0]).toMatchObject({
      id,
      employeeName: 'ليلى',
    });
  });
});
