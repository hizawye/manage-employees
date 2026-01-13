import { useState, useEffect, useCallback } from 'react';
import { Attendance, CreateAttendanceInput, AttendanceStatus } from '../models';
import {
  getAttendanceByDate,
  getAttendanceByEmployee,
  upsertAttendance,
  deleteAttendance,
} from '../database/repositories';

export function useAttendanceByDate(date: string) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAttendanceByDate(date);
      setAttendance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const markAttendance = useCallback(
    async (
      employeeId: string,
      status: AttendanceStatus,
      hoursWorked?: number,
      notes?: string
    ): Promise<Attendance> => {
      const input: CreateAttendanceInput = {
        employeeId,
        date,
        status,
        hoursWorked,
        notes,
      };
      const result = await upsertAttendance(input);
      await loadAttendance();
      return result;
    },
    [date, loadAttendance]
  );

  const removeAttendance = useCallback(
    async (id: string): Promise<void> => {
      await deleteAttendance(id);
      await loadAttendance();
    },
    [loadAttendance]
  );

  return {
    attendance,
    loading,
    error,
    refresh: loadAttendance,
    markAttendance,
    removeAttendance,
  };
}

export function useEmployeeAttendance(
  employeeId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!employeeId) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAttendanceByEmployee(employeeId, startDate, endDate);
      setAttendance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [employeeId, startDate, endDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  return { attendance, loading, error, refresh: loadAttendance };
}
