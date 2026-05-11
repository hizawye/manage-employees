import { useState, useEffect, useCallback } from 'react';
import { getAttendanceInRange } from '../database/repositories';
import { useAuth } from '../auth/useAuth';

interface AttendanceStats {
  weeklyPresent: number;
  weeklyTotal: number;
  monthlyPresent: number;
  monthlyTotal: number;
}

export function useAttendanceStats(weekStart: string, weekEnd: string, monthStart: string, monthEnd: string) {
  const { user } = useAuth();
  const [stats, setStats] = useState<AttendanceStats>({
    weeklyPresent: 0,
    weeklyTotal: 0,
    monthlyPresent: 0,
    monthlyTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) {
      setStats({
        weeklyPresent: 0,
        weeklyTotal: 0,
        monthlyPresent: 0,
        monthlyTotal: 0,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [weeklyAttendance, monthlyAttendance] = await Promise.all([
        getAttendanceInRange(user.id, weekStart, weekEnd),
        getAttendanceInRange(user.id, monthStart, monthEnd),
      ]);

      const weeklyPresent = weeklyAttendance.filter(a => a.status === 'present').length;
      const weeklyHalf = weeklyAttendance.filter(a => a.status === 'half_day').length;
      const monthlyPresent = monthlyAttendance.filter(a => a.status === 'present').length;
      const monthlyHalf = monthlyAttendance.filter(a => a.status === 'half_day').length;

      setStats({
        weeklyPresent: weeklyPresent + weeklyHalf * 0.5,
        weeklyTotal: weeklyAttendance.length,
        monthlyPresent: monthlyPresent + monthlyHalf * 0.5,
        monthlyTotal: monthlyAttendance.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance stats');
    } finally {
      setLoading(false);
    }
  }, [user, weekStart, weekEnd, monthStart, monthEnd]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refresh = useCallback(() => {
    return loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}
