import * as Crypto from 'expo-crypto';
import { getDatabase } from '../index';
import {
  Employee,
  EmployeeStatus,
  WageType,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../../models';

interface EmployeeRow {
  id: string;
  name: string;
  phone: string;
  role: string;
  wage_type: string;
  wage_rate: number;
  join_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    wageType: row.wage_type as WageType,
    wageRate: row.wage_rate,
    joinDate: row.join_date,
    status: row.status as EmployeeStatus,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO employees (id, name, phone, role, wage_type, wage_rate, join_date, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.phone,
      input.role,
      input.wageType,
      input.wageRate,
      input.joinDate,
      input.status,
      input.notes || null,
      now,
      now,
    ]
  );

  return {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAllEmployees(status?: EmployeeStatus): Promise<Employee[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM employees';
  const params: string[] = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY name ASC';

  const rows = await db.getAllAsync<EmployeeRow>(query, params);
  return rows.map(mapRowToEmployee);
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<EmployeeRow>(
    'SELECT * FROM employees WHERE id = ?',
    [id]
  );
  return row ? mapRowToEmployee(row) : null;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.phone !== undefined) {
    fields.push('phone = ?');
    values.push(input.phone);
  }
  if (input.role !== undefined) {
    fields.push('role = ?');
    values.push(input.role);
  }
  if (input.wageType !== undefined) {
    fields.push('wage_type = ?');
    values.push(input.wageType);
  }
  if (input.wageRate !== undefined) {
    fields.push('wage_rate = ?');
    values.push(input.wageRate);
  }
  if (input.joinDate !== undefined) {
    fields.push('join_date = ?');
    values.push(input.joinDate);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }
  if (input.notes !== undefined) {
    fields.push('notes = ?');
    values.push(input.notes || null);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteEmployee(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM employees WHERE id = ?', [id]);
}

export async function searchEmployees(query: string): Promise<Employee[]> {
  const db = await getDatabase();
  const searchPattern = `%${query}%`;
  const rows = await db.getAllAsync<EmployeeRow>(
    `SELECT * FROM employees
     WHERE name LIKE ? OR phone LIKE ? OR role LIKE ?
     ORDER BY name ASC`,
    [searchPattern, searchPattern, searchPattern]
  );
  return rows.map(mapRowToEmployee);
}
