import { getEmployeeById } from './EmployeeRepository';

export async function assertEmployeeOwnedByUser(userId: number, employeeId: string): Promise<void> {
  const employee = await getEmployeeById(userId, employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }
}
