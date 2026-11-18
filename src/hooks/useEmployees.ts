import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { Employee, EmployeeStatus, CreateEmployeeInput, UpdateEmployeeInput } from '../models';
import { EmployeeService } from '../services/EmployeeService';
import { useAuth } from '../auth/useAuth';
import { t } from '../i18n';

type Snapshot<T> = { scope: string; data?: T; loading: boolean; error: string | null };

// A slow read from a previous account, route or filter must never replace the current view.
function useEmployeeRead<T>(scope: string | null, read: () => Promise<T>) {
  const [snapshot, setSnapshot] = useState<Snapshot<T>>();
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    if (!scope) return;
    setSnapshot(previous => ({ scope, data: previous?.scope === scope ? previous.data : undefined, loading: true, error: null }));
    try {
      const data = await read();
      if (generation.current === ticket) setSnapshot({ scope, data, loading: false, error: null });
    } catch {
      if (generation.current === ticket) setSnapshot({ scope, loading: false, error: t('employee.loadError') });
    }
  }, [scope, read]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { generation.current++; };
  }, [refresh]));
  const current = snapshot?.scope === scope ? snapshot : undefined;
  return { data: current?.data, loading: !!scope && (current?.loading ?? true), error: current?.error ?? null, refresh };
}

const empty: Employee[] = [];
export function useEmployees(statusFilter?: EmployeeStatus) {
  const { user } = useAuth();
  const owner = user?.id;
  const read = useCallback(() => owner === undefined ? Promise.resolve(empty) : EmployeeService.getAllEmployees(owner, statusFilter, true), [owner, statusFilter]);
  const { data, ...state } = useEmployeeRead(owner === undefined ? null : JSON.stringify([owner, statusFilter]), read);
  const { refresh } = state;
  const addEmployee = useCallback(async (input: CreateEmployeeInput) => {
    if (owner === undefined) throw new Error(t('common.error'));
    const employee = await EmployeeService.createEmployee(owner, input);
    await refresh();
    return employee;
  }, [owner, refresh]);
  const editEmployee = useCallback(async (id: string, input: UpdateEmployeeInput) => {
    if (owner === undefined) throw new Error(t('common.error'));
    await EmployeeService.updateEmployee(owner, id, input);
    await refresh();
  }, [owner, refresh]);
  const removeEmployee = useCallback(async (id: string) => {
    if (owner === undefined) throw new Error(t('common.error'));
    await EmployeeService.deleteEmployee(owner, id);
    await refresh();
  }, [owner, refresh]);
  return { employees: data ?? empty, ...state, addEmployee, editEmployee, removeEmployee };
}

export function useEmployee(id: string | undefined) {
  const { user } = useAuth();
  const owner = user?.id;
  const read = useCallback(() => owner === undefined || !id ? Promise.resolve(null) : EmployeeService.getEmployeeById(owner, id, true), [owner, id]);
  const { data, ...state } = useEmployeeRead(owner === undefined || !id ? null : JSON.stringify([owner, id]), read);
  return { employee: data ?? null, ...state };
}
