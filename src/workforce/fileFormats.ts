import type { CalendarShift, Cell } from './reports';

export function csvText(rows: Cell[][]): string {
  function cell(value: Cell): string {
    if (typeof value === 'number') return String(value);
    const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/u.test(value)
      ? "'" + value
      : value;
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  return (
    '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n'
  );
}

export function printableReport(
  title: string,
  period: string,
  headers: string[],
  rows: Cell[][],
  rtl: boolean
): string {
  const escape = (v: Cell) =>
    String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return `<!doctype html><html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><meta charset="utf-8"><style>
  @page{margin:14mm}body{font:13px sans-serif;color:#17243a}h1{font-size:22px}table{border-collapse:collapse;width:100%}th,td{text-align:start;padding:6px;border:1px solid #cbd5e1;overflow-wrap:anywhere}th{background:#edf2f9}tr{break-inside:avoid}
  </style><h1>${escape(title)}</h1><p>${escape(period)}</p><table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></html>`;
}

function foldCalendarLine(line: string) {
  let result = '',
    length = 0;
  for (const ch of line) {
    const cp = ch.codePointAt(0)!;
    const bytes = cp < 128 ? 1 : cp < 2048 ? 2 : cp < 65536 ? 3 : 4;
    if (length + bytes > 75) {
      result += '\r\n ';
      length = 1;
    }
    result += ch;
    length += bytes;
  }
  return result;
}
export function calendarText(
  shifts: CalendarShift[],
  now: Date = new Date()
): string {
  const escape = (v: string) =>
    v
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\n|\r/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  const local = (v: string) => v.replace(/[-:]/g, '') + '00';
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Manage Employees//Work Schedule//EN',
    'CALSCALE:GREGORIAN',
  ];
  for (const s of shifts)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escape(s.id)}@manageemployees.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${local(s.start)}`,
      `DTEND:${local(s.end)}`,
      `SUMMARY:${escape([s.employee, s.role].filter(Boolean).join(' · '))}`,
      `LOCATION:${escape(s.location || '')}`,
      `DESCRIPTION:${escape(s.notes || '')}`,
      'END:VEVENT'
    );
  lines.push('END:VCALENDAR');
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
