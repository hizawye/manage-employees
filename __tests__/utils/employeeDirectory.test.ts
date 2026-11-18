import { Employee, EmployeeStatus, WageType } from '../../src/models/Employee';
import { filterEmployees } from '../../src/utils/employeeDirectory';

const people: Employee[] = [
  { id: '1', name: 'أمِـينة', role: 'مسؤولة', phone: '+213 (٠٥٥) ۱۲۳-۴۵۶۷', wageType: WageType.DAILY, wageRate: 10, joinDate: '', status: EmployeeStatus.ACTIVE, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Renée', role: 'Comptable', phone: '456', wageType: WageType.HOURLY, wageRate: 15, joinDate: '', status: EmployeeStatus.INACTIVE, createdAt: '', updatedAt: '' },
];
it('finds Arabic names and phone numbers across keyboard types and separators', () => {
  for (const query of ['امينة', '  أمينة  ', '0551234567', '۰۵۵ ۱۲۳۴', 'مسؤولة']) {
    expect(filterEmployees(people, query)).toEqual([people[0]]);
  }
});
it('combines employment status with name or role and preserves the directory order', () => {
  expect(filterEmployees(people, 'renee', EmployeeStatus.INACTIVE)).toEqual([people[1]]);
  expect(filterEmployees(people, 'comptable', EmployeeStatus.ACTIVE)).toEqual([]);
  expect(filterEmployees(people, '  ')).toEqual(people);
});
