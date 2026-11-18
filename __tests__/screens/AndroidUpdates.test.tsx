import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Alert, AppState, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AndroidUpdateBanner,
  AndroidUpdatesProvider,
  AndroidUpdateSettings,
} from '../../src/updates/AndroidUpdates';
import {
  apkUrl,
  fetchPublishedVersion,
} from '../../src/updates/androidRelease';

let mockNeedsBridge = false;
jest.mock('../../src/updates/signingMigration', () => ({
  needsSigningMigration: () => mockNeedsBridge,
}));

let mockPathname = '/employees';
jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.2.3' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock'
  )
);
jest.mock('../../src/i18n', () => ({
  t: (key: string, args?: { version?: string }) =>
    args?.version ? key + ' ' + args.version : key,
}));
jest.mock('../../src/updates/androidRelease', () => ({
  ...jest.requireActual('../../src/updates/androidRelease'),
  fetchPublishedVersion: jest.fn(),
}));
const fetchVersion = jest.mocked(fetchPublishedVersion);
const originalPlatform = Platform.OS;
const originalState = AppState.currentState;
function mount(profile = false) {
  mockPathname = profile ? '/profile' : '/employees';
  return render(
    <AndroidUpdatesProvider>
      <AndroidUpdateBanner />
      {profile && <AndroidUpdateSettings />}
    </AndroidUpdatesProvider>
  );
}
beforeEach(async () => {
  await AsyncStorage.clear();
  fetchVersion.mockReset();
  mockNeedsBridge = false;
  Platform.OS = 'android';
  AppState.currentState = 'active';
});
afterEach(() => {
  Platform.OS = originalPlatform;
  AppState.currentState = originalState;
  jest.restoreAllMocks();
});

test('checks in foreground, dismisses a single version, and uses the cached result on next launch', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  AppState.currentState = 'background';
  fetchVersion.mockResolvedValue('1.3.0');
  const first = mount();
  expect(fetchVersion).not.toHaveBeenCalled();
  AppState.currentState = 'active';
  await act(async () => {
    listener.mock.calls
      .filter(([type]) => type === 'change')
      .forEach(([, notify]) => notify('active'));
  });
  expect(fetchVersion).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('updates.available 1.3.0')).toBeTruthy();
  fireEvent.press(screen.getByText('updates.dismiss'));
  expect(screen.queryByText('updates.download')).toBeNull();
  first.unmount();
  const second = mount(true);
  await screen.findByText('updates.available 1.3.0');
  expect(fetchVersion).toHaveBeenCalledTimes(1);
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  fireEvent.press(screen.getByText('updates.download'));
  expect(open).toHaveBeenCalledWith(apkUrl('1.3.0'));
  fetchVersion.mockResolvedValue('2.0.0');
  fireEvent.press(screen.getByLabelText('updates.check'));
  await screen.findByText('updates.available 2.0.0');
  second.unmount();
  mount();
  await screen.findByText('updates.available 2.0.0');
  expect(fetchVersion).toHaveBeenCalledTimes(2);
});
test('manual retry bypasses failure cooldown; equal or older versions offer no download', async () => {
  fetchVersion
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce('1.2.3')
    .mockResolvedValueOnce('1.1.0');
  const listener = jest.spyOn(AppState, 'addEventListener');
  mount(true);
  await screen.findByText('updates.error');
  await act(async () => {
    listener.mock.calls
      .filter(([type]) => type === 'change')
      .forEach(([, notify]) => notify('active'));
  });
  expect(fetchVersion).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByLabelText('updates.check'));
  await screen.findByText('updates.current');
  expect(screen.queryByText('updates.download')).toBeNull();
  fireEvent.press(screen.getByLabelText('updates.check'));
  await waitFor(() => expect(fetchVersion).toHaveBeenCalledTimes(3));
});
test('never fetches Android packages on iOS and handles a missing browser', async () => {
  Platform.OS = 'ios';
  const ios = mount(true);
  expect(screen.queryByText('updates.title')).toBeNull();
  expect(fetchVersion).not.toHaveBeenCalled();
  ios.unmount();
  Platform.OS = 'android';
  fetchVersion.mockResolvedValue('2.1.0');
  const alert = jest.spyOn(Alert, 'alert');
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('unavailable'));
  mount(true);
  fireEvent.press(await screen.findByText('updates.download'));
  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith('updates.title', 'updates.openError')
  );
});

test('coalesces foreground requests and automatically refreshes an expired check', async () => {
  const start = Date.now();
  const now = jest.spyOn(Date, 'now').mockReturnValue(start);
  let settle: (version: string) => void = () => {};
  fetchVersion
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        })
    )
    .mockResolvedValueOnce('1.4.0');
  const sub = jest.spyOn(AppState, 'addEventListener');
  mount(true);
  const resume = () =>
    sub.mock.calls
      .filter(([kind]) => kind === 'change')
      .forEach(([, notify]) => notify('active'));
  await waitFor(() => expect(fetchVersion).toHaveBeenCalledTimes(1));
  await act(async () => {
    resume();
    resume();
    settle('1.2.3');
  });
  await screen.findByText('updates.current');
  expect(fetchVersion).toHaveBeenCalledTimes(1);
  now.mockReturnValue(start + 12 * 60 * 60 * 1000 + 1);
  await act(async () => {
    resume();
  });
  expect(await screen.findByText('updates.available 1.4.0')).toBeTruthy();
});

test('a signing bridge offers only the standard APK for its installed version, even offline or on the latest release', async () => {
  mockNeedsBridge = true;
  fetchVersion
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce('1.2.3');
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const banner = mount();
  expect(screen.getByText('updates.migrationTitle')).toBeTruthy();
  fireEvent.press(screen.getByText('updates.migrationAction'));
  expect(open).toHaveBeenCalledWith(apkUrl('1.2.3'));
  await act(async () => {});
  expect(screen.queryByText('updates.dismiss')).toBeNull();
  banner.unmount();
  mount(true);
  expect(screen.getAllByText('updates.migrationTitle')).toHaveLength(1);
  fireEvent.press(screen.getByText('updates.migrationAction'));
  expect(open).toHaveBeenLastCalledWith(apkUrl('1.2.3'));
  expect(screen.queryByText('updates.current')).toBeNull();
  await act(async () => {});
});
