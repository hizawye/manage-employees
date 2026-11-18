import { Employee, EmployeeStatus } from '../models/Employee';

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}|ـ/gu, '').toLowerCase()
    .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 15)).trim();
}

export function filterEmployees(employees: Employee[], query: string, status?: EmployeeStatus) {
  const term = normalize(query);
  const phone = /^[+\d\s().-]+$/.test(term) ? term.replace(/\D/g, '') : '';
  return employees.filter(employee => {
    if (status && employee.status !== status) return false;
    if (!term) return true;
    return [employee.name, employee.role, employee.phone].some(value => normalize(value).includes(term)) ||
      (phone.length > 0 && normalize(employee.phone).replace(/\D/g, '').includes(phone));
  });
}
