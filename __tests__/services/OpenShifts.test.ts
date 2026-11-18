import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { createEmployee } from '../../src/database/repositories/EmployeeRepository';
import { openTestDatabase } from '../../test-utils/sqlite';
import { EmployeeStatus, WageType } from '../../src/models';
import {
  openShift,
  recordInterest,
  decideOffer,
  getOffers,
} from '../../src/workforce/coverage';
import { saveWorkShift } from '../../src/services/WorkShiftService';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.requireActual('crypto').randomUUID,
}));
it('fills an open shift once and rolls back conflicting assignments without losing the queue', async () => {
  const db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  try {
    for (const m of migrations) await m.up(db);
    await db.execAsync(
      "INSERT INTO users(id,username,is_guest,created_at) VALUES (81,'first',1,''),(82,'second',1,'');"
    );
    const add = (owner: number, name: string) =>
      createEmployee(owner, {
        name,
        phone: '00',
        role: 'Desk',
        status: EmployeeStatus.ACTIVE,
        wageType: WageType.HOURLY,
        wageRate: 100,
        joinDate: '2026-01-01',
      });
    const a = await add(81, 'Local'),
      b = await add(82, 'Other');
    const offer = await openShift(
      81,
      '2027-02-01',
      '٢٢:٠٠',
      '02:00',
      'Night',
      'West'
    );
    await expect(recordInterest(81, offer, b.id)).rejects.toThrow();
    await recordInterest(81, offer, a.id);
    await recordInterest(81, offer, a.id);
    expect((await getOffers(81, false))[0].bids).toHaveLength(1);
    expect(await getOffers(82, false)).toEqual([]);
    await expect(decideOffer(82, offer, a.id)).rejects.toThrow();
    const shift = await saveWorkShift(81, {
      employeeId: a.id,
      date: '2027-02-02',
      startTime: '01:00',
      endTime: '03:00',
      role: '',
      location: '',
      notes: '',
    });
    await expect(decideOffer(81, offer, a.id)).rejects.toThrow(
      'schedule.overlap'
    );
    expect((await getOffers(81, false))[0].status).toBe('open');
    await db.runAsync('DELETE FROM work_shifts WHERE id=?', [shift]);
    await decideOffer(81, offer, a.id);
    await expect(decideOffer(81, offer, a.id)).rejects.toThrow();
    expect(
      await db.getFirstAsync(
        'SELECT start_at,end_at FROM work_shifts WHERE id=?',
        [offer]
      )
    ).toEqual({ start_at: '2027-02-01T22:00', end_at: '2027-02-02T02:00' });
    expect((await getOffers(81, true))[0]).toMatchObject({
      status: 'filled',
      assigned_name: 'Local',
    });
  } finally {
    await db.closeAsync();
  }
});
