import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { getAllEmployees } from '../../src/database/repositories/EmployeeRepository';
import { EmployeeService } from '../../src/services/EmployeeService';
import { openTestDatabase } from '../../test-utils/sqlite';
import { csvText } from '../../src/workforce/fileFormats';
import {
  employeeTemplate,
  importRoster,
  previewRoster,
  rosterFileLimit,
} from '../../src/workforce/employeeImport';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.requireActual('crypto').randomUUID,
}));
const owner = 33;
const other = 34;
const header = [
  'name',
  'phone',
  'role',
  'wage_type',
  'wage_rate',
  'join_date',
  'status',
  'notes',
];
const basic = [
  'Lina',
  '+213 555 000 001',
  'Clerk',
  'hourly',
  '250.75',
  '2024-02-29',
  'active',
  '',
];
let db: ReturnType<typeof openTestDatabase>;
beforeEach(async () => {
  db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  for (const migration of migrations.filter((m) => m.version <= 9))
    await migration.up(db);
  await db.execAsync(
    "INSERT INTO users(id,username,is_guest,created_at) VALUES(33,'owner',1,'x'),(34,'other',1,'x')"
  );
  EmployeeService.clearCache(owner);
});
afterEach(() => db.closeAsync());

it('round-trips generated Arabic, emoji, quotes, commas and multi-line cell contents through the shared CSV writer', async () => {
  const atoms = ['خ', ' É ', '٠١٢', '"', ',', '\r', '\n', '\r\n', '🙂', '='];
  const rows = atoms.flatMap((left) =>
    atoms.map((right, index) => [
      'Lina ' + index,
      '0555',
      'Clerk',
      'daily',
      '250',
      '2024-02-29',
      'active',
      'X' + left + right + 'Z',
    ])
  );
  const preview = await previewRoster(owner, csvText([header, ...rows]));
  expect(preview.invalid).toBe(0);
  expect(preview.rows.map((row) => row.input?.notes)).toEqual(
    rows.map((row) => row[7])
  );
  expect(preview.rows[10].row).toBeGreaterThan(10);
});

it('accepts reordered headers, optional columns, Arabic digits and verified template defaults', async () => {
  expect((await previewRoster(owner, employeeTemplate())).ready).toBe(1);
  const csv = csvText([
    ['role', 'phone', 'name', 'wage_rate', 'join_date', 'wage_type'],
    ['مدير', '٠٥٥٥٥٥٥', 'نادية', '٢٥٠٫٧٥', '٢٠٢٤-٠٢-٢٩', 'hourly'],
  ]);
  expect((await previewRoster(owner, csv)).rows[0].input).toMatchObject({
    name: 'نادية',
    wageRate: 250.75,
    joinDate: '2024-02-29',
    status: 'active',
  });
});

it('skips same name and phone within this roster or file, survives retry, and keeps a shared phone available for distinct people', async () => {
  expect(await EmployeeService.getAllEmployees(owner)).toEqual([]);
  const duplicate = [...basic];
  duplicate[0] = ' lina ';
  duplicate[1] = '٢١٣٥٥٥٠٠٠٠٠١';
  const different = ['Nora', ...basic.slice(1)];
  const source = csvText([header, basic, duplicate, different]);
  expect(await previewRoster(owner, source)).toMatchObject({
    ready: 2,
    duplicates: 1,
    invalid: 0,
  });
  expect(await getAllEmployees(owner)).toEqual([]);
  expect(await importRoster(other, source)).toEqual({ added: 2, skipped: 1 });
  expect(await importRoster(owner, source)).toEqual({ added: 2, skipped: 1 });
  expect(await importRoster(owner, source)).toEqual({ added: 0, skipped: 3 });
  const records = await EmployeeService.getAllEmployees(owner);
  expect(records.map((row) => row.name)).toEqual(['Lina', 'Nora']);
  expect(records[0]).toMatchObject({
    phone: '+213 555 000 001',
    wageRate: 250.75,
  });
  expect(
    await db.getFirstAsync(
      "SELECT COUNT(*) AS count FROM logs WHERE user_id=? AND action='create_employee'",
      [owner]
    )
  ).toEqual({ count: 2 });
});

it('blocks the entire file when any row is invalid, and validates header, quoting, size, and row caps before writing', async () => {
  const invalid = [...basic];
  invalid[4] = '1e999';
  const source = csvText([header, basic, invalid]);
  expect((await previewRoster(owner, source)).rows[1]).toMatchObject({
    state: 'invalid',
    field: 'wage_rate',
    row: 3,
  });
  await expect(importRoster(owner, source)).rejects.toThrow('work.invalid');
  await expect(previewRoster(owner, 'name,phone\nLina,5')).rejects.toThrow(
    'work.badHeader'
  );
  await expect(
    previewRoster(owner, header.join(',') + '\n"unclosed')
  ).rejects.toThrow('leave.importQuotes');
  await expect(
    previewRoster(owner, header.join(',') + '\n"closed"extra')
  ).rejects.toThrow('leave.importQuotes');
  await expect(previewRoster(owner, header.join(','))).rejects.toThrow(
    'leave.importEmpty'
  );
  await expect(
    previewRoster(owner, 'س'.repeat(rosterFileLimit / 2 + 1))
  ).rejects.toThrow('work.fileTooLarge');
  await expect(
    previewRoster(owner, csvText([header, ...Array(1001).fill(basic)]))
  ).rejects.toThrow('work.fileTooLarge');
  const invalidDate = [...basic];
  invalidDate[5] = '2026-02-29';
  expect(
    (await previewRoster(owner, csvText([header, invalidDate]))).invalid
  ).toBe(1);
  expect(await getAllEmployees(owner)).toEqual([]);
});

it('rolls back every roster row and audit entry if an audit write fails partway', async () => {
  await db.execAsync(`CREATE TRIGGER fail_second BEFORE INSERT ON logs WHEN NEW.description='Added employee Nora'
    BEGIN SELECT RAISE(ABORT,'fixture failure'); END;`);
  const source = csvText([header, basic, ['Nora', ...basic.slice(1)]]);
  await expect(importRoster(owner, source)).rejects.toThrow('fixture failure');
  expect(await getAllEmployees(owner)).toEqual([]);
  expect(
    await db.getFirstAsync(
      'SELECT COUNT(*) AS count FROM logs WHERE user_id=?',
      [owner]
    )
  ).toEqual({ count: 0 });
  await db.execAsync('DROP TRIGGER fail_second;');
  expect(await importRoster(owner, source)).toEqual({ added: 2, skipped: 0 });
});
