import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getDatabase } from '../database';
import { createEmployee } from '../database/repositories/EmployeeRepository';
import { EmployeeService } from '../services/EmployeeService';
import {
  EmployeeStatus,
  WageType,
  type CreateEmployeeInput,
} from '../models/Employee';
import { isPayrollDate } from '../utils/payrollDate';
import { parseLocalizedDecimal } from '../utils/numberUtils';
import { isCurrencyAmount } from '../utils/money';
import { csvText } from './fileFormats';

const requiredHeaders = [
  'name',
  'phone',
  'role',
  'wage_type',
  'wage_rate',
  'join_date',
] as const;
const headers = [...requiredHeaders, 'status', 'notes'];
export const rosterFileLimit = 1_048_576;
const rowLimit = 1000;

export function employeeTemplate() {
  return csvText([
    headers,
    [
      'Samira Example',
      '0555000000',
      'Supervisor',
      'hourly',
      250,
      '2026-01-01',
      'active',
      '',
    ],
  ]);
}

type CsvRecord = { row: number; cells: string[] };
type ImportRow = {
  row: number;
  name: string;
  state: 'ready' | 'duplicate' | 'invalid';
  field?: string;
  input?: CreateEmployeeInput;
};
export type RosterPreview = {
  rows: ImportRow[];
  ready: number;
  duplicates: number;
  invalid: number;
};

function utf8Length(value: string) {
  let bytes = 0;
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    bytes += code < 128 ? 1 : code < 2048 ? 2 : code < 65536 ? 3 : 4;
  }
  return bytes;
}

function parseRecords(source: string): CsvRecord[] {
  if (source.length > rosterFileLimit || utf8Length(source) > rosterFileLimit)
    throw new Error('work.fileTooLarge');
  const text = source.replace(/^\uFEFF/, '');
  const records: CsvRecord[] = [];
  let cells: string[] = [],
    value = '',
    inQuotes = false,
    afterQuote = false,
    line = 1,
    startLine = 1;

  function endField() {
    cells.push(value);
    value = '';
    afterQuote = false;
    if (cells.length > headers.length) throw new Error('work.badHeader');
  }
  function endRecord() {
    endField();
    if (cells.some((cell) => cell.trim() !== '')) {
      records.push({ row: startLine, cells });
      if (records.length > rowLimit + 1) throw new Error('work.fileTooLarge');
    }
    cells = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else {
        value += ch;
        if (ch === '\n' || (ch === '\r' && text[i + 1] !== '\n')) line++;
      }
    } else if (ch === ',') {
      endField();
    } else if (ch === '\r' || ch === '\n') {
      endRecord();
      if (ch === '\r' && text[i + 1] === '\n') i++;
      startLine = ++line;
    } else if (ch === '"' && value === '' && !afterQuote) {
      inQuotes = true;
    } else {
      if (ch === '"' || afterQuote) throw new Error('leave.importQuotes');
      value += ch;
    }
  }
  if (inQuotes) throw new Error('leave.importQuotes');
  if (cells.length || value || afterQuote) endRecord();
  return records;
}

interface RosterIdentity {
  name: string;
  phone: string;
}

function key(person: RosterIdentity): string {
  const name = person.name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase();
  const phone = person.phone
    .normalize('NFKC')
    .replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 15))
    .replace(/[\s().-]/gu, '')
    .replace(/^\+/, '');
  return JSON.stringify([name, phone]);
}

function rosterRows(source: string): ImportRow[] {
  const [header, ...records] = parseRecords(source);
  const columns = header?.cells.map((c) => c.trim().toLowerCase()) ?? [];
  if (
    new Set(columns).size !== columns.length ||
    requiredHeaders.some((h) => !columns.includes(h)) ||
    columns.some((h) => !headers.includes(h))
  )
    throw new Error('work.badHeader');
  if (!records.length) throw new Error('leave.importEmpty');
  return records.map(({ row, cells }) => {
    const get = (name: string) => cells[columns.indexOf(name)]?.trim() ?? '';
    const name = get('name'),
      phone = get('phone').replace(/^'(?=\+)/, ''),
      role = get('role');
    const wageType = get('wage_type').toLowerCase() as WageType;
    const wageRate = parseLocalizedDecimal(get('wage_rate'));
    const joinDate = get('join_date').replace(/[٠-٩۰-۹]/g, (d) =>
      String(d.charCodeAt(0) & 15)
    );
    const status = (get('status').toLowerCase() || 'active') as EmployeeStatus;
    const invalid = (field?: string): ImportRow => ({
      row,
      name,
      state: 'invalid',
      field,
    });
    if (cells.length !== columns.length) return invalid();
    if (!name) return invalid('name');
    if (!/[0-9٠-٩۰-۹]/.test(phone)) return invalid('phone');
    if (!role) return invalid('role');
    if (!Object.values(WageType).includes(wageType))
      return invalid('wage_type');
    if (wageRate <= 0 || !isCurrencyAmount(wageRate))
      return invalid('wage_rate');
    if (!isPayrollDate(joinDate)) return invalid('join_date');
    if (!Object.values(EmployeeStatus).includes(status))
      return invalid('status');
    return {
      row,
      name,
      state: 'ready',
      input: {
        name,
        phone,
        role,
        wageType,
        wageRate,
        joinDate,
        status,
        notes: get('notes'),
      },
    };
  });
}

async function compareRoster(
  db: SQLiteDatabase,
  owner: number,
  rows: ImportRow[]
): Promise<RosterPreview> {
  const existing = await db.getAllAsync<RosterIdentity>(
    'SELECT name,phone FROM employees WHERE user_id=?',
    [owner]
  );
  const seen = new Set(existing.map(key));
  let ready = 0,
    duplicates = 0,
    invalid = 0;
  const reviewed = rows.map((row) => {
    if (!row.input) {
      invalid++;
      return row;
    }
    const id = key(row.input);
    if (seen.has(id)) {
      duplicates++;
      return { ...row, state: 'duplicate' as const };
    }
    seen.add(id);
    ready++;
    return row;
  });
  return { rows: reviewed, ready, duplicates, invalid };
}

export async function previewRoster(
  owner: number,
  source: string
): Promise<RosterPreview> {
  return compareRoster(await getDatabase(), owner, rosterRows(source));
}

export async function importRoster(
  owner: number,
  source: string
): Promise<{ added: number; skipped: number }> {
  const rows = rosterRows(source);
  if (rows.some((row) => row.state === 'invalid'))
    throw new Error('work.invalid');
  const db = await getDatabase();
  let added = 0,
    skipped = 0;
  async function write(tx: SQLiteDatabase) {
    if (!(await tx.getFirstAsync('SELECT id FROM users WHERE id=?', [owner])))
      throw new Error('work.saveError');
    const preview = await compareRoster(tx, owner, rows);
    for (const row of preview.rows) {
      if (row.state === 'ready' && row.input) {
        await createEmployee(owner, row.input, tx);
        added++;
      }
    }
    skipped = preview.duplicates;
  }
  if (Platform.OS === 'web') await db.withTransactionAsync(() => write(db));
  else await db.withExclusiveTransactionAsync(write);
  EmployeeService.clearCache(owner);
  return { added, skipped };
}
