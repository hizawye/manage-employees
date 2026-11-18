// Shifts and weekly windows last at most 24 hours. Only the last occurrence on or before the
// shift's final minute can intersect it. Use the stored local wall clock throughout.
export function recurringConflict(rule: 'a' | 'NEW', start: string, end: string): string {
  const daysBack = `((CAST(strftime('%w',${end},'-1 minute') AS INTEGER)-${rule}.weekday+7)%7)`;
  const midnight = `(unixepoch(date(${end},'-1 minute'))/60 - ${daysBack}*1440)`;
  const begins = `(${midnight}+${rule}.start_minute)`;
  return `${midnight} >= unixepoch(${rule}.effective_date)/60
    AND ${begins} < unixepoch(${end})/60
    AND ${begins}+${rule}.duration > unixepoch(${start})/60`;
}
