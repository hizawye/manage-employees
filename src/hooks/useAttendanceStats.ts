import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAttendanceInRange } from '../database/repositories';
import { useAuth } from '../auth/useAuth';
import { t } from '../i18n';

const emptyStats = { weeklyPresent: 0, weeklyTotal: 0, monthlyPresent: 0, monthlyTotal: 0 };

export function useAttendanceStats(weekStart: string, weekEnd: string, monthStart: string, monthEnd: string) {
  const owner = useAuth().user?.id;
  const key = JSON.stringify([owner, weekStart, weekEnd, monthStart, monthEnd]);
  const [snapshot, setSnapshot] = useState<{ key: string; stats: typeof emptyStats; loading: boolean; error: string | null }>();
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++version.current;
    if (owner === undefined) return;
    setSnapshot(old => ({ key, stats: old?.key === key ? old.stats : emptyStats, loading: true, error: null }));
    try {
      const [week, month] = await Promise.all([
        getAttendanceInRange(owner, weekStart, weekEnd), getAttendanceInRange(owner, monthStart, monthEnd),
      ]);
      if (version.current !== ticket) return;
      const present = (records: typeof week) => records.reduce((sum, day) =>
        sum + (day.status === 'present' ? 1 : day.status === 'half_day' ? 0.5 : 0), 0);
      setSnapshot({ key, loading: false, error: null, stats: {
        weeklyPresent: present(week), weeklyTotal: week.length, monthlyPresent: present(month), monthlyTotal: month.length,
      } });
    } catch {
      if (version.current === ticket) setSnapshot({ key, stats: emptyStats, loading: false, error: t('attendance.historyLoadError') });
    }
  }, [key, owner, weekStart, weekEnd, monthStart, monthEnd]);
  useFocusEffect(useCallback(() => {
    void refresh();
    return () => { version.current++; };
  }, [refresh]));
  const current = snapshot?.key === key ? snapshot : undefined;
  return { stats: current?.stats ?? emptyStats, loading: current?.loading ?? owner !== undefined, error: current?.error ?? null, refresh };
}
