import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { getDocumentAsync } from 'expo-document-picker';
import ImportEmployeesScreen from '../../app/workforce/import';
import {
  importRoster,
  previewRoster,
  type RosterPreview,
} from '../../src/workforce/employeeImport';
import { shareReport } from '../../src/workforce/shareReport';

jest.mock('@/lib/utils', () => jest.requireActual('../../src/lib/utils'), {
  virtual: true,
});
jest.mock('../../src/i18n', () => ({
  t: (key: string, params?: Record<string, number>) =>
    params ? key + JSON.stringify(params) : key,
}));
jest.mock('../../src/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 44 } }),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system', () => ({
  File: class {
    readonly size = 10;
    readonly uri = 'file://outside/roster';
    readonly exists = true;
    async text() {
      return 'demo,csv';
    }
  },
  Paths: { cache: { uri: 'file://cache/' } },
}));
jest.mock('../../src/workforce/employeeImport', () => ({
  employeeTemplate: () => 'template-columns',
  importRoster: jest.fn(),
  previewRoster: jest.fn(),
  rosterFileLimit: 1048576,
}));
jest.mock('../../src/workforce/shareReport', () => ({
  shareReport: jest.fn(),
}));
const preview: RosterPreview = {
  ready: 1,
  duplicates: 0,
  invalid: 0,
  rows: [{ row: 2, name: 'Lina', state: 'ready' }],
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        name: 'my-team.csv',
        uri: 'file://outside/roster',
        size: 10,
        lastModified: 0,
      },
    ],
  });
});
it('shares the template, previews the selected file, and imports only when the manager presses Import', async () => {
  jest.mocked(previewRoster).mockResolvedValue(preview);
  jest.mocked(importRoster).mockResolvedValue({ added: 1, skipped: 0 });
  render(<ImportEmployeesScreen />);
  fireEvent.press(screen.getByText('work.template'));
  await waitFor(() =>
    expect(shareReport).toHaveBeenCalledWith(
      'employees-template',
      'csv',
      'template-columns'
    )
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'work.pickFile' }).props
        .accessibilityState.disabled
    ).toBeFalsy()
  );
  fireEvent.press(screen.getByText('work.pickFile'));
  await screen.findByText('Lina');
  expect(previewRoster).toHaveBeenCalledWith(44, 'demo,csv');
  expect(importRoster).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('work.import'));
  await screen.findByText('work.importDone{"added":1,"skipped":0}');
  expect(importRoster).toHaveBeenCalledWith(44, 'demo,csv');
});
it('keeps import disabled when the preview contains an invalid row', async () => {
  jest.mocked(previewRoster).mockResolvedValue({
    ...preview,
    invalid: 1,
    rows: [
      ...preview.rows,
      { row: 3, name: 'Invalid', state: 'invalid', field: 'join_date' },
    ],
  });
  render(<ImportEmployeesScreen />);
  fireEvent.press(screen.getByText('work.pickFile'));
  await screen.findByText('leave.importBlocked');
  expect(
    screen.getByRole('button', { name: 'work.import' }).props.accessibilityState
      .disabled
  ).toBe(true);
  expect(importRoster).not.toHaveBeenCalled();
});
