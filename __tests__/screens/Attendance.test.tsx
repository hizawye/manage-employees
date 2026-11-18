import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AttendanceScreen from '../../app/(tabs)/attendance';
import { useAttendanceByDate, useEmployees } from '../../src/hooks';
import { AttendanceStatus, EmployeeStatus, WageType } from '../../src/models';

jest.mock('../../src/hooks', () => ({
  useEmployees: jest.fn(),
  useAttendanceByDate: jest.fn(),
  useRefresh: () => ({ refreshing: false, onRefresh: jest.fn() }),
}));
jest.mock('../../src/i18n', () => ({ t: (key: string) => key, isArabic: () => false }));
jest.mock('@/lib/utils', () => jest.requireActual('../../src/lib/utils'), { virtual: true });
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

const date = '2026-02-01';
const employee = {
  id: 'hourly', name: 'Lina', role: 'Technician', phone: '555', wageType: WageType.HOURLY,
  wageRate: 100, status: EmployeeStatus.ACTIVE, joinDate: date, createdAt: date, updatedAt: date,
};
const shift = { id: 'shift', employeeId: employee.id, date, createdAt: date, updatedAt: date };
const markAttendance = jest.fn();
const attendanceState = {
  attendance: [], loading: false, error: null, refresh: jest.fn(), markAttendance, removeAttendance: jest.fn(),
};

beforeEach(() => {
  markAttendance.mockReset();
  markAttendance.mockResolvedValue({});
  jest.mocked(useEmployees).mockReturnValue({
    employees: [employee], loading: false, error: null, refresh: jest.fn(),
    addEmployee: jest.fn(), editEmployee: jest.fn(), removeEmployee: jest.fn(),
  });
  jest.mocked(useAttendanceByDate).mockReturnValue(attendanceState);
});

it('lets the service pick the half-day default, then saves a fractional edit without changing the status', async () => {
  const { rerender } = render(<AttendanceScreen />);
  fireEvent.press(screen.getByText('attendance.halfDay'));
  await waitFor(() => expect(markAttendance).toHaveBeenCalledWith(employee.id, AttendanceStatus.HALF_DAY, undefined));

  jest.mocked(useAttendanceByDate).mockReturnValue({
    ...attendanceState, attendance: [{ ...shift, status: AttendanceStatus.HALF_DAY, hoursWorked: 4 }],
  });
  rerender(<AttendanceScreen />);
  const field = screen.getByLabelText('attendance.hoursWorked');
  expect(field.props.value).toBe('4');
  fireEvent.changeText(field, '٣٫٢٥');
  fireEvent(field, 'endEditing', { nativeEvent: { text: '٣٫٢٥' } });
  await waitFor(() => expect(markAttendance).toHaveBeenCalledWith(employee.id, AttendanceStatus.HALF_DAY, 3.25));
});

it('restores the last saved hours and shows the error on an invalid edit', async () => {
  jest.mocked(useAttendanceByDate).mockReturnValue({
    ...attendanceState, attendance: [{ ...shift, status: AttendanceStatus.PRESENT, hoursWorked: 6 }],
  });
  markAttendance.mockRejectedValue(new Error('attendance.invalidHours'));
  render(<AttendanceScreen />);
  const field = screen.getByLabelText('attendance.hoursWorked');
  fireEvent.changeText(field, '3h');
  fireEvent(field, 'endEditing', { nativeEvent: { text: '3h' } });
  await waitFor(() => expect(screen.getByText('attendance.invalidHours')).toBeTruthy());
  expect(field.props.value).toBe('6');
});

it('hides the hours field after absence is recorded', () => {
  jest.mocked(useAttendanceByDate).mockReturnValue({
    ...attendanceState, attendance: [{ ...shift, status: AttendanceStatus.ABSENT }],
  });
  render(<AttendanceScreen />);
  expect(screen.queryByLabelText('attendance.hoursWorked')).toBeNull();
});
