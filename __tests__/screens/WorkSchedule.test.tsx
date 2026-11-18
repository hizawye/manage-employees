import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { eligibleStaff, listUnavailable, saveUnavailable } from '../../src/services/AvailabilityService';
import ScheduleScreen from '../../app/workforce/schedule';
import { getAllEmployees } from '../../src/database/repositories/EmployeeRepository';
import {
  getShiftsInRange,
  listShiftTemplates,
  saveShiftTemplate,
  saveWorkShift,
} from '../../src/services/WorkShiftService';
import { EmployeeStatus, WageType } from '../../src/models';

jest.mock('expo-router', () => ({
  useFocusEffect(callback: () => (() => void) | undefined) {
    jest.requireActual('react').useEffect(callback, [callback]);
  },
}));
jest.mock('@/lib/utils', () => jest.requireActual('../../src/lib/utils'), { virtual: true });
jest.mock('../../src/i18n', () => ({
  t: (key: string) => key,
  getLocale: () => 'en',
  isArabic: () => false,
}));
jest.mock('../../src/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 44 } }) }));
jest.mock('../../src/database/repositories/EmployeeRepository', () => ({ getAllEmployees: jest.fn() }));
jest.mock('../../src/services/AvailabilityService', () => ({
  ...jest.requireActual('../../src/services/AvailabilityService'),
  eligibleStaff: jest.fn(),
  listUnavailable: jest.fn(),
  saveUnavailable: jest.fn(),
}));
jest.mock('../../src/services/WorkShiftService', () => ({
  ...jest.requireActual('../../src/services/WorkShiftService'),
  getShiftsInRange: jest.fn(),
  saveWorkShift: jest.fn(),
  listShiftTemplates: jest.fn(),
  saveShiftTemplate: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAllEmployees).mockResolvedValue([
    {
      id: 'e1',
      name: 'Sara',
      phone: '000',
      role: 'Service',
      status: EmployeeStatus.ACTIVE,
      wageRate: 100,
      wageType: WageType.HOURLY,
      joinDate: '2026-01-01',
      createdAt: '',
      updatedAt: '',
    },
  ]);
  jest.mocked(getShiftsInRange).mockResolvedValue([]);
});

it('opens a day, saves overnight work with Arabic input and keeps a failed draft editable', async () => {
  jest
    .mocked(saveWorkShift)
    .mockRejectedValueOnce(new Error('schedule.overlap'))
    .mockResolvedValueOnce('shift');
  render(<ScheduleScreen />);
  const buttons = await screen.findAllByLabelText(/^schedule.add/);
  expect(buttons).toHaveLength(7);
  fireEvent.press(buttons[0]);
  fireEvent.changeText(screen.getByLabelText('schedule.day'), '٢٠٢٦-١١-١٦');
  fireEvent.changeText(screen.getByLabelText('schedule.starts'), '٢٢:٠٠');
  fireEvent.changeText(screen.getByLabelText('schedule.ends'), '٠٦:٠٠');
  expect(screen.getByText('schedule.overnight')).toBeTruthy();
  fireEvent.press(screen.getByText('common.save'));
  await screen.findByText('schedule.overlap');
  expect(saveWorkShift).toHaveBeenCalledWith(
    44,
    expect.objectContaining({ date: '2026-11-16', employeeId: 'e1', startTime: '٢٢:٠٠' }),
    undefined
  );
  fireEvent.press(screen.getByText('common.save'));
  await waitFor(() => expect(saveWorkShift).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(getShiftsInRange).toHaveBeenCalledTimes(2));
});

it('opens named templates from the roster and saves the selected week', async () => {
  jest
    .mocked(listShiftTemplates)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: 'office', name: 'Office week', count: 3 }]);
  jest.mocked(saveShiftTemplate).mockResolvedValue('office');
  render(<ScheduleScreen />);
  await screen.findAllByLabelText(/^schedule.add/);
  fireEvent.press(screen.getByText('schedule.templates'));
  await screen.findByText('schedule.noTemplates');
  fireEvent.changeText(screen.getByLabelText('schedule.templateName'), 'Office week');
  fireEvent.press(screen.getByText('schedule.saveTemplate'));
  await screen.findByText('Office week');
  expect(saveShiftTemplate).toHaveBeenCalledWith(
    44,
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    'Office week'
  );
});

it('allows a manager to save an all-day weekly availability rule from the schedule', async () => {
  jest
    .mocked(listUnavailable)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        id: 'r',
        employeeId: 'e1',
        employeeName: 'Sara',
        weekday: 1,
        start: 0,
        duration: 1440,
        effective: '2026-12-01',
      },
    ]);
  jest.mocked(saveUnavailable).mockResolvedValue('r');
  render(<ScheduleScreen />);
  await screen.findAllByLabelText(/^schedule.add/);
  fireEvent.press(screen.getByText('schedule.availability'));
  await screen.findByText('schedule.noRules');
  fireEvent.press(screen.getByText('schedule.addRule'));
  fireEvent.press(screen.getByText('Monday'));
  fireEvent.changeText(screen.getByLabelText('schedule.effective'), '٢٠٢٦-١٢-٠١');
  fireEvent.press(screen.getByText('common.save'));
  await waitFor(() =>
    expect(saveUnavailable).toHaveBeenCalledWith(
      44,
      expect.objectContaining({
        weekday: 1,
        effective: '2026-12-01',
        allDay: true,
        employeeId: 'e1',
      }),
      undefined
    )
  );
  await screen.findByText('common.edit');
});

it('looks up eligible staff with the edited date and time and shows when nobody is available', async () => {
  jest.mocked(eligibleStaff).mockResolvedValue([]);
  render(<ScheduleScreen />);
  const buttons = await screen.findAllByLabelText(/^schedule.add/);
  fireEvent.press(buttons[0]);
  fireEvent.changeText(screen.getByLabelText('schedule.day'), '٢٠٢٦-١٢-٠١');
  fireEvent.press(screen.getByText('schedule.findAvailable'));
  await screen.findByText('schedule.eligibleEmpty');
  expect(eligibleStaff).toHaveBeenCalledWith(44, '2026-12-01', '09:00', '17:00', undefined);
});
