import { useState, useEffect, useCallback } from 'react';
import {
  Employee,
  EmployeeStatus,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../models';
import { EmployeeService } from '../services/EmployeeService';
import { useAuth } from '../auth/useAuth';

export function useEmployees(statusFilter?: EmployeeStatus) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await EmployeeService.getAllEmployees(user.id, statusFilter, forceRefresh);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const addEmployee = useCallback(async (input: CreateEmployeeInput): Promise<Employee> => {
    if (!user) throw new Error('User not authenticated');
    const employee = await EmployeeService.createEmployee(user.id, input);
    await loadEmployees(true); // Force refresh after mutation
    return employee;
  }, [user, loadEmployees]);

  const editEmployee = useCallback(async (id: string, input: UpdateEmployeeInput): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    await EmployeeService.updateEmployee(user.id, id, input);
    await loadEmployees(true); // Force refresh after mutation
  }, [user, loadEmployees]);

  const removeEmployee = useCallback(async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    await EmployeeService.deleteEmployee(user.id, id);
    await loadEmployees(true); // Force refresh after mutation
  }, [user, loadEmployees]);

  const search = useCallback(async (query: string): Promise<void> => {
    if (!user) {
      setEmployees([]);
      return;
    }

    // If empty query, reload all employees
    if (!query.trim()) {
      await loadEmployees();
      return;
    }

    try {
      // Client-side filtering: faster than database query
      // Get all employees (from cache if available)
      const allEmployees = await EmployeeService.getAllEmployees(user.id, statusFilter);

      // Filter in-memory (case-insensitive search on name, role, phone)
      const lowerQuery = query.toLowerCase();
      const results = allEmployees.filter(emp =>
        emp.name.toLowerCase().includes(lowerQuery) ||
        emp.role.toLowerCase().includes(lowerQuery) ||
        (emp.phone && emp.phone.toLowerCase().includes(lowerQuery))
      );

      setEmployees(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    }
  }, [user, loadEmployees, statusFilter]);

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
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployee = useCallback(async (forceRefresh = false) => {
    if (!id || !user) {
      setEmployee(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await EmployeeService.getEmployeeById(user.id, id, forceRefresh);
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const refresh = useCallback(() => {
    return loadEmployee(true);
  }, [loadEmployee]);

  return { employee, loading, error, refresh };
}
