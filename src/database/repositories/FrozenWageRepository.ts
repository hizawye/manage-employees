import { getDatabase } from '../index';
import type { Employee } from '../../models';

type WageTerms = Pick<Employee, 'wageType' | 'wageRate'>;
export async function getFrozenWageRates(
  owner: number,
  start: string,
  end: string,
  employeeId?: string
) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WageTerms & { month: string; employee_id: string }>(
    `SELECT r.month,r.employee_id,r.wage_type AS wageType,r.wage_rate AS wageRate
    FROM pay_period_rates r WHERE r.user_id=? AND r.month BETWEEN ? AND ? ${employeeId ? 'AND r.employee_id=?' : ''}`,
    [owner, start.slice(0, 7), end.slice(0, 7), ...(employeeId ? [employeeId] : [])]
  );
  return new Map<string, WageTerms>(rows.map((r) => [`${r.employee_id}/${r.month}`, r]));
}
export function wageTermsForDate(
  rates: Map<string, WageTerms>,
  employee: Pick<Employee, 'id' | 'wageRate' | 'wageType'>,
  date: string
): WageTerms {
  return rates.get(`${employee.id}/${date.slice(0, 7)}`) ?? employee;
}
export function isClosedPeriodError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('periods.locked');
}
