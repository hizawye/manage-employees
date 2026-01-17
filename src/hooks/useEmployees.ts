import { useState, useEffect, useCallback } from 'react';
import {
  Employee,
  EmployeeStatus,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../models';
import { EmployeeService } from '../services/EmployeeService';

export function useEmployees(statusFilter?: EmployeeStatus) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await EmployeeService.getAllEmployees(statusFilter, forceRefresh);
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
    const employee = await EmployeeService.createEmployee(input);
    await loadEmployees(true); // Force refresh after mutation
    return employee;
  }, [loadEmployees]);

  const editEmployee = useCallback(async (id: string, input: UpdateEmployeeInput): Promise<void> => {
    await EmployeeService.updateEmployee(id, input);
    await loadEmployees(true); // Force refresh after mutation
  }, [loadEmployees]);

  const removeEmployee = useCallback(async (id: string): Promise<void> => {
    await EmployeeService.deleteEmployee(id);
    await loadEmployees(true); // Force refresh after mutation
  }, [loadEmployees]);

  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      await loadEmployees();
      return;
    }
    try {
      setLoading(true);
      const results = await EmployeeService.searchEmployees(query);
      setEmployees(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [loadEmployees]);

  const refresh = useCallback(() => {
    return loadEmployees(true); // Force refresh on manual pull-to-refresh
  }, [loadEmployees]);

  return {
    employees,
    loading,
    error,
    refresh,
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

  const loadEmployee = useCallback(async (forceRefresh = false) => {
    if (!id) {
      setEmployee(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await EmployeeService.getEmployeeById(id, forceRefresh);
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

  const refresh = useCallback(() => {
    return loadEmployee(true);
  }, [loadEmployee]);

  return { employee, loading, error, refresh };
}
