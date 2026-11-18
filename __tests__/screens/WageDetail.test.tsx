import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import WageDetailScreen from '../../app/(tabs)/wages/[employeeId]';
import { AttendanceStatus, EmployeeStatus, WageType } from '../../src/models';
import { calculateWagesForPeriod } from '../../src/services/WageCalculationService';
import { EmployeeService } from '../../src/services/EmployeeService';
import { WageAdjustmentService } from '../../src/services/WageAdjustmentService';
import { PaymentService } from '../../src/services/PaymentService';

jest.setTimeout(20000);

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ employeeId: 'emp' }),
  useFocusEffect: (callback: () => () => void) => jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('../../src/auth/useAuth', () => {
  const session = { user: { id: 10 } };
  return { useAuth: () => session };
});
jest.mock('../../src/i18n', () => ({ t: (key: string) => key, isArabic: () => false }));
jest.mock('@/lib/utils', () => jest.requireActual('../../src/lib/utils'), { virtual: true });
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));
jest.mock('../../src/services/WageCalculationService');
jest.mock('../../src/services/EmployeeService');
jest.mock('../../src/services/WageAdjustmentService');
jest.mock('../../src/services/PaymentService', () => ({
  ...jest.requireActual('../../src/services/PaymentService'),
  PaymentService: { getEmployeePayments: jest.fn(), recordPayment: jest.fn() },
}));
jest.mock('../../src/utils/dateUtils', () => ({
  getMonthRange: () => ({ start: '2025-11-01', end: '2025-11-30' }),
  getTodayString: () => '2025-11-10',
  formatDate: (date: string) => date,
  formatDateShort: (date: string) => date,
  formatCurrency: (amount: number) => amount.toFixed(2) + ' DZD',
}));

const date = '2025-11-03';
const employee = {
  id: 'emp', name: 'Worker', role: 'Operator', phone: '123',
  wageType: WageType.DAILY, wageRate: 100, status: EmployeeStatus.ACTIVE,
  joinDate: date, createdAt: date, updatedAt: date,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(EmployeeService.getEmployeeById).mockResolvedValue(employee);
  jest.mocked(calculateWagesForPeriod).mockResolvedValue({
    employeeId: employee.id, employeeName: employee.name, wageType: employee.wageType,
    wageRate: 100, totalWage: 125, period: { start: '2025-11-01', end: '2025-11-30' },
    details: [
      { date, hasAttendance: true, status: AttendanceStatus.PRESENT, wageEarned: 125, adjustment: 25, adjustmentNote: 'Bonus' },
      { date: '2025-11-04', hasAttendance: false, status: AttendanceStatus.ABSENT, wageEarned: 0 },
    ],
    totalDaysPresent: 1, totalDaysAbsent: 0, totalHalfDays: 0,
  });
  jest.mocked(PaymentService.getEmployeePayments).mockResolvedValue([]);
});

it('displays a single net adjustment and opens an existing or unmarked day for editing', async () => {
  render(<WageDetailScreen />);
  const row = await screen.findByLabelText('wages.adjustWage · ' + date);
  expect(screen.getAllByText('125.00 DZD')).toHaveLength(2); // total and day
  expect(screen.queryByText('150.00 DZD')).toBeNull();
  fireEvent.press(row);
  const amount = screen.getByPlaceholderText('wages.adjustmentAmount');
  expect(amount.props.value).toBe('25');
  expect(screen.getByPlaceholderText('wages.adjustmentNote').props.value).toBe('Bonus');
  fireEvent.changeText(amount, '-١٢٫٥٠');
  fireEvent.press(screen.getByText('common.save'));
  await waitFor(() => expect(WageAdjustmentService.saveAdjustment).toHaveBeenCalledWith(10, {
    userId: 10, employeeId: 'emp', date, amount: -12.5, note: 'Bonus',
  }));
  fireEvent.press(await screen.findByLabelText('wages.adjustWage · 2025-11-04'));
  expect(screen.getByPlaceholderText('wages.adjustmentAmount').props.value).toBe('');
});

it('prefills the outstanding balance and requires a valid explicit confirmation to overpay', async () => {
  render(<WageDetailScreen />);
  fireEvent.press(await screen.findByText('wages.markAsPaid'));
  const amount = screen.getByPlaceholderText('wages.paymentAmount');
  expect(amount.props.value).toBe('125.00');
  fireEvent.changeText(amount, '3oops');
  expect(screen.getByRole('button', { name: 'wages.confirmPayment', disabled: true })).toBeTruthy();
  fireEvent.changeText(amount, '١٢٦٫٥٠');
  fireEvent.press(screen.getByText('wages.confirmOverpayment'));
  await waitFor(() => expect(PaymentService.recordPayment).toHaveBeenCalledWith(10, {
    userId: 10, employeeId: 'emp', amount: 126.5, periodStart: '2025-11-01', periodEnd: '2025-11-30',
    paymentDate: '2025-11-10', notes: undefined,
  }));
});
