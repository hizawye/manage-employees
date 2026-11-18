import { getDatabase } from '../../src/database';
import { migrations } from '../../src/database/migrations';
import { createEmployee, getAttendanceHistoryInRange, getAttendanceInRange, updateEmployee } from '../../src/database/repositories';
import { AttendanceStatus, Employee, EmployeeStatus, WageType } from '../../src/models';
import { AttendanceService } from '../../src/services/AttendanceService';
import { calculateWagesForPeriod } from '../../src/services/WageCalculationService';
import { openTestDatabase } from '../../test-utils/sqlite';

jest.mock('../../src/database', () => ({ getDatabase: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.requireActual('crypto').randomUUID }));
jest.mock('../../src/i18n', () => ({ t: (key: string) => key }));

describe('hourly attendance in SQLite', () => {
  const userId = 10;
  let employee: Employee;
  let db: ReturnType<typeof openTestDatabase>;

  beforeAll(async () => {
    db = openTestDatabase();
    jest.mocked(getDatabase).mockResolvedValue(db);
    for (const migration of migrations) await migration.up(db);
    await db.runAsync('INSERT INTO users (id, username, is_guest, created_at) VALUES (?, ?, 1, ?)',
      [userId, 'attendance-test', '2026-01-01']);
    employee = await createEmployee(userId, {
      name: 'Lina', role: 'Technician', phone: '555', wageType: WageType.HOURLY, wageRate: 100,
      status: EmployeeStatus.ACTIVE, joinDate: '2026-01-01',
    });
  });

  afterAll(async () => { await db.closeAsync(); });

  it('pays eight hours for a default full day, four for a half day, then the edited hours', async () => {
    const input = { employeeId: employee.id, date: '2026-02-01' };
    const fullDay = await AttendanceService.markAttendance(userId, { ...input, status: AttendanceStatus.PRESENT });
    expect(fullDay.hoursWorked).toBe(8);
    const halfDay = await AttendanceService.markAttendance(userId, { ...input, status: AttendanceStatus.HALF_DAY });
    expect(halfDay.hoursWorked).toBe(4);
    await AttendanceService.markAttendance(userId,
      { ...input, status: AttendanceStatus.HALF_DAY, hoursWorked: 3.25 });
    const history = await getAttendanceInRange(userId, input.date, input.date);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: fullDay.id, status: AttendanceStatus.HALF_DAY, hoursWorked: 3.25 });
    expect((await calculateWagesForPeriod(userId, employee, input.date, input.date)).totalWage).toBe(325);
  });

  it('removes saved hours when marking a worked shift absent and refreshes its wage', async () => {
    const input = { employeeId: employee.id, date: '2026-02-02' };
    const previous = await AttendanceService.markAttendance(userId,
      { ...input, status: AttendanceStatus.PRESENT, hoursWorked: 6.5 });
    expect((await calculateWagesForPeriod(userId, employee, input.date, input.date)).totalWage).toBe(650);
    const absent = await AttendanceService.markAttendance(userId, { ...input, status: AttendanceStatus.ABSENT });
    expect(absent.id).toBe(previous.id);
    expect(await db.getFirstAsync('SELECT status, hours_worked FROM attendance WHERE id = ?', [absent.id]))
      .toEqual({ status: 'absent', hours_worked: null });
    const wages = await calculateWagesForPeriod(userId, employee, input.date, input.date);
    expect(wages).toMatchObject({ totalWage: 0, totalHoursWorked: 0 });
  });

  it('treats old absence rows with stored hours as having no worked hours', async () => {
    const date = '2026-02-03';
    await db.runAsync(
      'INSERT INTO attendance (id,user_id,employee_id,date,status,hours_worked,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      ['legacy-absence', userId, employee.id, date, 'absent', 8, date, date]
    );
    expect((await getAttendanceInRange(userId, date, date))[0].hoursWorked).toBeUndefined();
    expect((await calculateWagesForPeriod(userId, employee, date, date)).totalHoursWorked).toBe(0);
  });

  it.each([NaN, Infinity, -1, 0, 24.5].map((hours, i) => ({ hours, date: `2026-02-1${i}` })))(
    'rejects invalid worked hours $hours without a write', async ({ hours, date }) => {
    await expect(AttendanceService.markAttendance(userId,
      { employeeId: employee.id, date, status: AttendanceStatus.PRESENT, hoursWorked: hours }
    )).rejects.toThrow('attendance.invalidHours');
    expect(await getAttendanceInRange(userId, date, date)).toEqual([]);
  });

  it('returns a named shift for an inactive employee only in the owner’s history and date range', async () => {
    const date = '2026-02-20';
    await AttendanceService.markAttendance(userId,
      { employeeId: employee.id, date, status: AttendanceStatus.HALF_DAY, hoursWorked: 2.5 });
    await updateEmployee(userId, employee.id, { status: EmployeeStatus.INACTIVE });
    const history = await getAttendanceHistoryInRange(userId, date, date);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ date, employeeName: 'Lina', status: AttendanceStatus.HALF_DAY, hoursWorked: 2.5 });
    expect(await getAttendanceHistoryInRange(20, date, date)).toEqual([]);
    expect(await getAttendanceHistoryInRange(userId, '2026-03-01', '2026-03-07')).toEqual([]);
  });
});
