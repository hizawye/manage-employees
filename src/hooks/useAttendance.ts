import { useState, useEffect, useCallback } from 'react';
import { Attendance, CreateAttendanceInput, AttendanceStatus } from '../models';
import { AttendanceService } from '../services/AttendanceService';

export function useAttendanceByDate(date: string) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await AttendanceService.getAttendanceByDate(date, forceRefresh);
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
      const result = await AttendanceService.markAttendance(input);
      await loadAttendance(true); // Force refresh after mutation
      return result;
    },
    [date, loadAttendance]
  );

  const removeAttendance = useCallback(
    async (id: string, employeeId?: string): Promise<void> => {
      await AttendanceService.deleteAttendance(id, employeeId);
      await loadAttendance(true); // Force refresh after mutation
    },
    [loadAttendance]
  );

  const refresh = useCallback(() => {
    return loadAttendance(true); // Force refresh on manual pull-to-refresh
  }, [loadAttendance]);

  return {
    attendance,
    loading,
    error,
    refresh,
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

  const loadAttendance = useCallback(async (forceRefresh = false) => {
    if (!employeeId) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await AttendanceService.getAttendanceByEmployee(
        employeeId,
        startDate,
        endDate,
        forceRefresh
      );
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

  const refresh = useCallback(() => {
    return loadAttendance(true);
  }, [loadAttendance]);

  return { attendance, loading, error, refresh };
}
