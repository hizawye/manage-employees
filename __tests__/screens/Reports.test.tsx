import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import ReportsScreen from '../../app/workforce/reports';
import { loadReport } from '../../src/workforce/reports';
import { shareReport } from '../../src/workforce/shareReport';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('../../src/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 911 } }),
}));
jest.mock('../../src/hooks/useEmployees', () => ({
  useEmployees: () => ({ employees: [{ id: '7', name: 'Rana' }] }),
}));
jest.mock('../../src/i18n', () => ({
  getLocale: () => 'en',
  t: (key: string) => key,
}));
jest.mock('../../src/workforce/reports', () => ({
  ...jest.requireActual('../../src/workforce/reports'),
  loadReport: jest.fn(),
}));
jest.mock('../../src/workforce/shareReport', () => ({
  shareReport: jest.fn(),
}));

it('uses the selected employee and date range for the preview and exported file', async () => {
  jest
    .mocked(loadReport)
    .mockResolvedValue({
      columns: ['employee', 'earnings'],
      rows: [['Rana', 23]],
    });
  jest.mocked(shareReport).mockResolvedValue(undefined);
  render(<ReportsScreen />);
  await screen.findByText('23');
  fireEvent.press(screen.getByText('work.custom'));
  fireEvent.changeText(screen.getByLabelText('work.from'), '٢٠٢٦-٠٢-٠١');
  fireEvent.changeText(screen.getByLabelText('work.to'), '٢٠٢٦-٠٢-٢٨');
  fireEvent.press(screen.getByText('work.all'));
  fireEvent.press(screen.getByRole('button', { name: 'Rana' }));
  await waitFor(() =>
    expect(loadReport).toHaveBeenCalledWith(
      911,
      'payroll',
      '2026-02-01',
      '2026-02-28',
      '7'
    )
  );
  fireEvent.press(await screen.findByText('work.csv'));
  await waitFor(() =>
    expect(shareReport).toHaveBeenCalledWith(
      'payroll-2026-02-01-2026-02-28',
      'csv',
      expect.stringContaining('"Rana",23')
    )
  );
  fireEvent.changeText(screen.getByLabelText('work.to'), '2026-01-15');
  expect(screen.getByText('work.rangeError')).toBeTruthy();
  expect(screen.queryByText('work.csv')).toBeNull();
});
