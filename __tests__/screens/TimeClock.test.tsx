import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import Clock from '../../app/workforce/clock';
import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { payPeriodsMigration } from '../../src/database/migrations/014_pay_periods';
import { timeClockMigration } from '../../src/database/migrations/012_time_clock';
import { createEmployee, getAttendanceByEmployeeAndDate } from '../../src/database/repositories';
import { EmployeeStatus, WageType } from '../../src/models';
import { clockIn, clockOut } from '../../src/services/TimeClockService';
import { getTodayString } from '../../src/utils/dateUtils';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual('node:crypto').randomUUID(),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]),
}));
jest.mock('../../src/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 20 } }) }));
jest.mock('../../src/i18n', () => ({
  t: (key: string) => key,
  isArabic: () => false,
  getLocale: () => 'en',
}));
jest.mock('@/lib/utils', () => jest.requireActual('../../src/lib/utils'), { virtual: true });
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

let db: SQLiteDatabase;
let employeeId: string;
beforeEach(async () => {
  db = openTestDatabase();
  jest.mocked(getDatabase).mockResolvedValue(db);
  for (const step of migrations.filter((m) => m.version <= 9)) await step.up(db);
  await timeClockMigration.up(db);
  await payPeriodsMigration.up(db);
  await db.execAsync(
    "INSERT INTO users(id,username,created_at) VALUES(20,'clock_owner','2026-01-01')"
  );
  employeeId = (
    await createEmployee(20, {
      name: 'Test cashier',
      phone: '101',
      role: 'Reception',
      wageType: WageType.HOURLY,
      wageRate: 180,
      status: EmployeeStatus.ACTIVE,
      joinDate: '2026-01-01',
    })
  ).id;
});
afterEach(async () => {
  jest.restoreAllMocks();
  await db.closeAsync();
});

it('runs a clock-in, unpaid break, return and clock-out from the roster', async () => {
  const dialog = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<Clock />);
  fireEvent.press(await screen.findByText('clock.clockIn'));
  fireEvent.press(await screen.findByText('clock.takeBreak'));
  await act(async () => {
    dialog.mock.lastCall?.[2]?.find((a) => a.text === 'clock.unpaid')?.onPress?.();
  });
  fireEvent.press(await screen.findByText('clock.endBreak'));
  await screen.findByText('clock.takeBreak');
  fireEvent.press(screen.getByText('clock.clockOut'));
  await screen.findByText('clock.clockIn');
  const entries = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM clock_entries WHERE ended_at IS NOT NULL'
  );
  const breaks = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM clock_breaks WHERE ended_at IS NOT NULL AND paid=0'
  );
  expect(entries?.n).toBe(1);
  expect(breaks?.n).toBe(1);
});

it('requires the manager to confirm before copying hours to attendance', async () => {
  const time = new Date();
  time.setHours(8, 0, 0, 0);
  await clockIn(20, employeeId, 'demo', time.getTime());
  await clockOut(20, 'demo', time.getTime() + 3600000);
  const dialog = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  render(<Clock />);
  fireEvent.press(await screen.findByText('clock.post'));
  expect(await getAttendanceByEmployeeAndDate(20, employeeId, getTodayString())).toBeNull();
  expect(dialog.mock.lastCall?.[0]).toBe('clock.postTitle');
  await act(async () => {
    dialog.mock.lastCall?.[2]?.find((a) => a.text === 'clock.applyHours')?.onPress?.();
  });
  await waitFor(() => expect(screen.getByText('clock.recorded')).toBeTruthy());
  expect(await getAttendanceByEmployeeAndDate(20, employeeId, getTodayString())).toMatchObject({
    hoursWorked: 1,
  });
});
