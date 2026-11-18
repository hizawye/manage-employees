import { getDatabase } from '../database';

export async function getWorkOverview(owner: number, day: string, now: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    shifts: number;
    pending: number;
    clocked: number;
    unchecked: number;
  }>(
    `SELECT
    (SELECT count(*) FROM work_shifts WHERE user_id=?1 AND start_at<?2||'T24:00' AND end_at>?2||'T00:00') AS shifts,
    (SELECT count(*) FROM time_off_requests WHERE user_id=?1 AND status='pending') AS pending,
    (SELECT count(*) FROM clock_entries WHERE user_id=?1 AND ended_at IS NULL) AS clocked,
    (SELECT count(DISTINCT s.employee_id) FROM work_shifts s WHERE s.user_id=?1 AND s.start_at>=?2||'T00:00' AND s.end_at<=?3
      AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.user_id=s.user_id AND a.employee_id=s.employee_id AND a.date=?2)
    ) AS unchecked`,
    [owner, day, now]
  );
  return row ?? { shifts: 0, pending: 0, clocked: 0, unchecked: 0 };
}
