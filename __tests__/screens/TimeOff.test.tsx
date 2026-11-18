import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import LeaveScreen from '../../app/workforce/leave';
import {
  listTimeOff,
  requestTimeOff,
  decideTimeOff,
  type TimeOffRequest,
} from '../../src/services/TimeOffService';

jest.mock('expo-router', () => ({
  useFocusEffect(callback: () => (() => void) | undefined) {
    jest.requireActual('react').useEffect(callback, [callback]);
  },
}));
jest.mock('@/lib/utils', () => jest.requireActual('../../src/lib/utils'), {
  virtual: true,
});
jest.mock('../../src/i18n', () => ({
  t: (key: string) => key,
  isArabic: () => false,
}));
jest.mock('../../src/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 71 } }),
}));
jest.mock('../../src/hooks/useEmployees', () => ({
  useEmployees: () => ({
    employees: [
      { id: 'e', name: 'Lina', role: 'Clerk', phone: '000', status: 'active' },
    ],
    loading: false,
  }),
}));
jest.mock('../../src/services/TimeOffService', () => ({
  ...jest.requireActual('../../src/services/TimeOffService'),
  listTimeOff: jest.fn(),
  requestTimeOff: jest.fn(),
  decideTimeOff: jest.fn(),
}));

const request: TimeOffRequest = {
  id: 'r',
  employeeId: 'e',
  employeeName: 'Lina',
  startDate: '2028-02-29',
  endDate: '2028-03-01',
  status: 'pending',
  type: 'sick',
  note: 'Fixture',
};
beforeEach(() => {
  jest.clearAllMocks();
});

it('records a request with Arabic date digits and submits it to the current workspace', async () => {
  jest.mocked(listTimeOff).mockResolvedValue([]);
  jest.mocked(requestTimeOff).mockResolvedValue('r');
  render(<LeaveScreen />);
  await screen.findByText('leave.empty');
  fireEvent.press(screen.getByText('leave.newRequest'));
  fireEvent.press(screen.getByText('Lina'));
  fireEvent.press(screen.getByText('leave.type.sick'));
  fireEvent.changeText(screen.getByLabelText('leave.start'), '٢٠٢٨-٠٢-٢٩');
  fireEvent.changeText(screen.getByLabelText('leave.end'), '٢٠٢٨-٠٣-٠١');
  fireEvent.changeText(screen.getByLabelText('leave.note'), 'Fixture');
  fireEvent.press(screen.getByText('leave.save'));
  await waitFor(() =>
    expect(requestTimeOff).toHaveBeenCalledWith(71, {
      employeeId: 'e',
      type: 'sick',
      startDate: '2028-02-29',
      endDate: '2028-03-01',
      note: 'Fixture',
    })
  );
  await screen.findByText('leave.empty');
});

it('lets the manager review a request, explains a scheduling conflict and keeps the pending request accessible', async () => {
  jest.mocked(listTimeOff).mockResolvedValue([request]);
  jest
    .mocked(decideTimeOff)
    .mockRejectedValueOnce(new Error('leave.shiftConflict'))
    .mockResolvedValueOnce(undefined);
  render(<LeaveScreen />);
  fireEvent.press(await screen.findByText('Lina'));
  expect(screen.getByText('Fixture')).toBeTruthy();
  fireEvent.press(screen.getByText('leave.approve'));
  await screen.findByText('leave.shiftConflict');
  expect(decideTimeOff).toHaveBeenCalledWith(71, 'r', 'approved');
  fireEvent.press(screen.getByText('leave.decline'));
  await waitFor(() =>
    expect(decideTimeOff).toHaveBeenCalledWith(71, 'r', 'declined')
  );
  await waitFor(() => expect(screen.queryByText('leave.approve')).toBeNull());
});
