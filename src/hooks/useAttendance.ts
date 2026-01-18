import { useState, useEffect, useCallback } from 'react';
import { Attendance, CreateAttendanceInput, AttendanceStatus } from '../models';
import { AttendanceService } from '../services/AttendanceService';
import { useAuth } from '../auth/useAuth';

export function useAttendanceByDate(date: string) {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await AttendanceService.getAttendanceByDate(user.id, date, forceRefresh);
      setAttendance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [user, date]);

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
      if (!user) throw new Error('User not authenticated');
      const input: CreateAttendanceInput = {
        employeeId,
        date,
        status,
        hoursWorked,
        notes,
      };
      const result = await AttendanceService.markAttendance(user.id, input);
      await loadAttendance(true); // Force refresh after mutation
      return result;
    },
    [user, date, loadAttendance]
  );

  const removeAttendance = useCallback(
    async (id: string, employeeId?: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');
      await AttendanceService.deleteAttendance(user.id, id, employeeId);
      await loadAttendance(true); // Force refresh after mutation
    },
    [user, loadAttendance]
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
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async (forceRefresh = false) => {
    if (!employeeId || !user) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await AttendanceService.getAttendanceByEmployee(
        user.id,
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
  }, [user, employeeId, startDate, endDate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const refresh = useCallback(() => {
    return loadAttendance(true);
  }, [loadAttendance]);

  return { attendance, loading, error, refresh };
}
