import { useState, useEffect, useCallback } from 'react';
import {
  Employee,
  EmployeeStatus,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../models';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
} from '../database/repositories';

export function useEmployees(statusFilter?: EmployeeStatus) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEmployees(statusFilter);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const addEmployee = useCallback(async (input: CreateEmployeeInput): Promise<Employee> => {
    const employee = await createEmployee(input);
    await loadEmployees();
    return employee;
  }, [loadEmployees]);

  const editEmployee = useCallback(async (id: string, input: UpdateEmployeeInput): Promise<void> => {
    await updateEmployee(id, input);
    await loadEmployees();
  }, [loadEmployees]);

  const removeEmployee = useCallback(async (id: string): Promise<void> => {
    await deleteEmployee(id);
    await loadEmployees();
  }, [loadEmployees]);

  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      await loadEmployees();
      return;
    }
    try {
      setLoading(true);
      const results = await searchEmployees(query);
      setEmployees(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [loadEmployees]);

  return {
    employees,
    loading,
    error,
    refresh: loadEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
    search,
  };
}

export function useEmployee(id: string | undefined) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployee = useCallback(async () => {
    if (!id) {
      setEmployee(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getEmployeeById(id);
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  return { employee, loading, error, refresh: loadEmployee };
}
