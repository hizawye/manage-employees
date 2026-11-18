import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../../src/auth/AuthService';
import { getDatabase } from '../../src/database';
import { runMigrations } from '../../src/database/migrations';
import { createEmployee, getAllEmployees } from '../../src/database/repositories/EmployeeRepository';
import { EmployeeStatus, WageType } from '../../src/models';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.requireActual('crypto').randomUUID,
  CryptoDigestAlgorithm: { SHA256: 'sha256' },
  digestStringAsync: async (algorithm: string, value: string) =>
    jest.requireActual('crypto').createHash(algorithm).update(value).digest('hex'),
  getRandomBytes: (count: number) => jest.requireActual('crypto').randomBytes(count),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

it('upgrades a guest workspace in place and keeps the next guest separate after logout', async () => {
  const db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    await AsyncStorage.clear();
    await runMigrations(db);
    await runMigrations(db);
    const guest = await AuthService.createGuestUser();
    await createEmployee(guest.id, {
      name: 'Fixture',
      phone: '000',
      role: 'Clerk',
      wageType: WageType.HOURLY,
      wageRate: 25,
      joinDate: '2026-03-10',
      status: EmployeeStatus.ACTIVE,
    });
    const account = await AuthService.convertGuestToUser('demo_manager', 'ExampleLocal123');
    expect(account).toMatchObject({ id: guest.id, isGuest: false });
    await AuthService.logout();
    const other = await AuthService.createGuestUser();
    expect(other.id).not.toBe(guest.id);
    expect(await getAllEmployees(other.id)).toEqual([]);
    await AuthService.logout();
    const back = await AuthService.login('demo_manager', 'ExampleLocal123');
    expect((await getAllEmployees(back.id)).map(employee => employee.name)).toEqual(['Fixture']);
    expect(await AuthService.getCurrentUser()).toMatchObject({ id: guest.id, isGuest: false });
  } finally {
    log.mockRestore();
    await db.closeAsync();
  }
});

it('preserves an existing registered workspace named legacy_import and upgrades a legacy password', async () => {
  const db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  try {
    await AsyncStorage.clear();
    await runMigrations(db);
    await AuthService.createGuestUser(); // Claims and removes the original migration placeholder.
    await AuthService.logout();
    const account = await AuthService.signup('legacy_import', 'LocalAccount123');
    await AuthService.logout();
    await AuthService.createGuestUser();
    await AuthService.logout();
    await expect(AuthService.login('legacy_import', 'WrongPassword1')).rejects.toThrow('Invalid credentials');
    await expect(AuthService.login('legacy_import', 'LocalAccount123')).resolves.toMatchObject({ id: account.id });

    const salt = 'previous-format-salt';
    const digest = (value: string): string => jest.requireActual('crypto').createHash('sha256').update(value).digest('hex');
    let legacyHash = digest('OldPassword42' + salt);
    for (let round = 0; round < 1000; round++) legacyHash = digest(legacyHash + salt);
    const legacy = await db.runAsync(
      'INSERT INTO users (username, password_hash, salt, created_at, is_guest) VALUES (?, ?, ?, ?, 0)',
      ['existing_user', legacyHash, salt, new Date().toISOString()]
    );
    await expect(AuthService.login('existing_user', 'OldPassword42')).resolves.toMatchObject({ id: legacy.lastInsertRowId });
    const upgraded = await db.getFirstAsync<{ password_hash: string; salt: string | null }>(
      'SELECT password_hash, salt FROM users WHERE id = ?', [legacy.lastInsertRowId]
    );
    expect(upgraded?.password_hash).toMatch(/^pbkdf2_sha256\$/);
    expect(upgraded?.salt).toBeNull();
    await AuthService.logout();
    await expect(AuthService.login('existing_user', 'OldPassword42')).resolves.toMatchObject({ id: legacy.lastInsertRowId });
  } finally {
    log.mockRestore();
    await db.closeAsync();
  }
}, 20000);
