import { randomUUID } from 'expo-crypto';
import { getDatabase } from '../database';
import { shiftBounds } from '../services/WorkShiftService';

export type Offer = {
  id: string;
  start_at: string;
  end_at: string;
  role: string;
  location: string;
  status: 'open' | 'filled' | 'cancelled';
  assigned_name: string | null;
};
export async function getOffers(owner: number, archived: boolean) {
  const db = await getDatabase();
  const offers = await db.getAllAsync<Offer>(
    `SELECT id,start_at,end_at,role,location,status,assigned_name FROM open_shifts WHERE user_id=? AND status ${archived ? "<> 'open'" : "= 'open'"} ORDER BY start_at ${archived ? 'DESC' : 'ASC'},id`,
    [owner]
  );
  const bids = await db.getAllAsync<{
    offer_id: string;
    employee_id: string;
    name: string;
  }>(
    `SELECT b.offer_id,b.employee_id,e.name FROM shift_bids b JOIN open_shifts o ON o.id=b.offer_id
    JOIN employees e ON e.id=b.employee_id AND e.user_id=o.user_id WHERE o.user_id=? AND o.status='open' AND e.status='active' ORDER BY e.name,e.id`,
    [owner]
  );
  return offers.map((o) => ({
    ...o,
    bids: bids.filter((b) => b.offer_id === o.id),
  }));
}
export async function openShift(
  owner: number,
  date: string,
  startTime: string,
  endTime: string,
  role: string,
  location: string
) {
  const { startAt, endAt } = shiftBounds(date, startTime, endTime);
  if (!role.trim()) throw new Error('coverage.roleRequired');
  const db = await getDatabase();
  const id = randomUUID();
  await db.runAsync(
    'INSERT INTO open_shifts(id,user_id,start_at,end_at,role,location) VALUES(?,?,?,?,?,?)',
    [id, owner, startAt, endAt, role.trim(), location.trim()]
  );
  return id;
}
export async function recordInterest(
  owner: number,
  id: string,
  employee: string
) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO shift_bids(offer_id,employee_id) SELECT id,? FROM open_shifts WHERE user_id=? AND id=? AND status='open'
    ON CONFLICT(offer_id,employee_id) DO NOTHING`,
    [employee, owner, id]
  );
  if (
    !result.changes &&
    !(await db.getFirstAsync(
      "SELECT 1 FROM shift_bids b JOIN open_shifts o ON o.id=b.offer_id WHERE o.user_id=? AND o.id=? AND o.status='open' AND b.employee_id=?",
      [owner, id, employee]
    ))
  )
    throw new Error('coverage.unavailable');
}
export async function decideOffer(
  owner: number,
  id: string,
  employee?: string
) {
  const db = await getDatabase();
  const result = employee
    ? await db.runAsync(
        `UPDATE open_shifts SET status='filled',assigned_id=?,assigned_name=(SELECT name FROM employees WHERE id=? AND user_id=?) WHERE user_id=? AND id=? AND status='open'`,
        [employee, employee, owner, owner, id]
      )
    : await db.runAsync(
        "UPDATE open_shifts SET status='cancelled' WHERE id=? AND user_id=? AND status='open'",
        [id, owner]
      );
  if (!result.changes) throw new Error('coverage.unavailable');
}
