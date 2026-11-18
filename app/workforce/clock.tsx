import { isClosedPeriodError } from '../../src/database/repositories/FrozenWageRepository';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  I18nManager,
  Pressable,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { addDays, parseISO } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { Text } from '../../src/components/ui/text';
import { Button } from '../../src/components/ui/button';
import { t, getLocale } from '../../src/i18n';
import { AttendanceStatus, EmployeeStatus, WageType } from '../../src/models';
import { formatDate, getTodayString, toISODateString } from '../../src/utils/dateUtils';
import {
  ClockDay,
  ClockError,
  PayStatus,
  clockDuration,
  clockIn,
  clockOut,
  closedWorkMs,
  endClockBreak,
  getClockDays,
  postClockAttendance,
  startClockBreak,
} from '../../src/services/TimeClockService';

function duration(ms: number) {
  if (ms > 0 && ms < 60000) return t('clock.lessMinute');
  const minutes = Math.floor(ms / 60000);
  return t('clock.duration', {
    hours: Math.floor(minutes / 60).toLocaleString(getLocale()),
    minutes: (minutes % 60).toLocaleString(getLocale()),
  });
}
function stamp(time: number, date: string) {
  const d = new Date(time);
  const clock = d.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
  return toISODateString(d) === date ? clock : `${formatDate(d)} ${clock}`;
}
function attendanceLabel(day: ClockDay) {
  if (!day.attendanceStatus) return t('clock.unmarked');
  const status =
    day.attendanceStatus === AttendanceStatus.HALF_DAY ? 'halfDay' : day.attendanceStatus;
  const text = t(`attendance.${status}`);
  return day.attendanceHours === null
    ? text
    : `${text} · ${duration(day.attendanceHours * 3_600_000)}`;
}

export default function TimeClockScreen() {
  const { user } = useAuth();
  return user ? <ClockWorkspace key={user.id} owner={user.id} /> : null;
}
function ClockWorkspace({ owner }: { owner: number }) {
  const [date, setDate] = useState(getTodayString);
  const [now, setNow] = useState(Date.now);
  const [snapshot, setSnapshot] = useState<{ date: string; days: ClockDay[]; failed: boolean }>();
  const [expanded, setExpanded] = useState<string>();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {
      const days = await getClockDays(owner, date);
      if (version === generation.current) setSnapshot({ date, days, failed: false });
    } catch {
      if (version === generation.current) setSnapshot({ date, days: [], failed: true });
    }
  }, [owner, date]);
  useFocusEffect(
    useCallback(() => {
      void load();
      const tick = setInterval(() => setNow(Date.now()), 15000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          setNow(Date.now());
          void load();
        }
      });
      return () => {
        clearInterval(tick);
        subscription.remove();
        generation.current++;
      };
    }, [load])
  );

  const run = async (job: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await job();
    } catch (error) {
      Alert.alert(
        t('common.error'),
        t(isClosedPeriodError(error) ? 'periods.locked' : `clock.${error instanceof ClockError ? error.reason : 'failed'}`)
      );
    } finally {
      setNow(Date.now());
      await load();
      locked.current = false;
      setBusy(false);
    }
  };
  const chooseBreak = (id: string) =>
    Alert.alert(t('clock.takeBreak'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('clock.paid'), onPress: () => void run(() => startClockBreak(owner, id, true)) },
      { text: t('clock.unpaid'), onPress: () => void run(() => startClockBreak(owner, id, false)) },
    ]);
  const review = (day: ClockDay) => {
    const work = closedWorkMs(day);
    const hourly = day.wageType === WageType.HOURLY;
    const confirm = (status: PayStatus) => () =>
      void run(() => postClockAttendance(owner, day, status));
    const message = [
      t('clock.review', { name: day.name, date: formatDate(date), time: duration(work) }),
      t('clock.old', { value: attendanceLabel(day) }),
      hourly
        ? t('clock.reviewHours', {
            hours: (work / 3600000).toLocaleString(getLocale(), { maximumFractionDigits: 4 }),
          })
        : t('clock.reviewDaily'),
    ].join('\n');
    Alert.alert(t('clock.postTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      ...(hourly ? [] : [{ text: t('clock.half'), onPress: confirm(AttendanceStatus.HALF_DAY) }]),
      {
        text: t(hourly ? 'clock.applyHours' : 'clock.full'),
        onPress: confirm(AttendanceStatus.PRESENT),
      },
    ]);
  };
  const today = toISODateString(new Date(now));
  const live = date === today;
  const visible = snapshot?.date === date ? snapshot : undefined;
  const before = () => setDate(toISODateString(addDays(parseISO(date), -1)));
  const after = () => setDate(toISODateString(addDays(parseISO(date), 1)));
  const renderDay = ({ item: day }: { item: ClockDay }) => {
    const active = live ? day.active : null;
    const pause = active?.breaks.find((b) => b.end === null);
    const actionsDisabled = busy || !live;
    const entries = day.entries;
    const total = entries.reduce((sum, e) => sum + clockDuration(e, day.bounds, now).workMs, 0);
    const details = expanded === day.id;
    const endShift = () => {
      if (!active) return;
      const finish = () => void run(() => clockOut(owner, active.id));
      if (!pause) {
        finish();
        return;
      }
      Alert.alert(t('clock.clockOut'), t('clock.closingBreak'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('clock.clockOut'), onPress: finish },
      ]);
    };
    const matched =
      day.wageType === WageType.HOURLY &&
      day.attendanceStatus === AttendanceStatus.PRESENT &&
      day.attendanceHours === closedWorkMs(day) / 3600000;
    return (
      <View className="rounded-xl border border-border bg-card p-4 gap-3 mb-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Text variant="large">{day.name}</Text>
            {live && (
              <Text variant="muted">
                {t(
                  `clock.${pause ? (pause.paid ? 'paid' : 'unpaid') : active ? 'working' : day.status === EmployeeStatus.INACTIVE ? 'inactive' : 'off'}`
                )}
              </Text>
            )}
          </View>
          {entries.length > 0 && (
            <Text variant="small">{t('clock.payable', { time: duration(total) })}</Text>
          )}
        </View>
        {live && (
          <View className="flex-row flex-wrap gap-2">
            {!active && day.status === EmployeeStatus.ACTIVE && (
              <Button
                disabled={actionsDisabled}
                onPress={() => void run(() => clockIn(owner, day.id))}
              >
                {t('clock.clockIn')}
              </Button>
            )}
            {active && (
              <>
                <Button
                  variant="outline"
                  disabled={actionsDisabled}
                  onPress={() =>
                    pause ? void run(() => endClockBreak(owner, pause.id)) : chooseBreak(active.id)
                  }
                >
                  {t(pause ? 'clock.endBreak' : 'clock.takeBreak')}
                </Button>
                <Button disabled={actionsDisabled} onPress={endShift}>
                  {t('clock.clockOut')}
                </Button>
              </>
            )}
          </View>
        )}
        {entries.length > 0 && (
          <View className="gap-2">
            <Button
              variant="ghost"
              accessibilityState={{ expanded: details }}
              onPress={() => setExpanded(details ? undefined : day.id)}
            >
              {t(details ? 'clock.hide' : 'clock.history')}
            </Button>
            {details &&
              entries.map((entry) => (
                <View key={entry.id} className="border-t border-border pt-2 gap-1">
                  <Text variant="small">
                    {stamp(entry.start, date)} –{' '}
                    {entry.end === null ? t('clock.ongoing') : stamp(entry.end, date)}
                  </Text>
                  {entry.breaks.map((b) => (
                    <Text key={b.id} variant="muted">
                      {t(b.paid ? 'clock.paid' : 'clock.unpaid')} · {stamp(b.start, date)} –{' '}
                      {b.end === null ? t('clock.ongoing') : stamp(b.end, date)}
                    </Text>
                  ))}
                </View>
              ))}
            {entries.some((e) => e.end === null) ? (
              <Text variant="muted">{t('clock.finished')}</Text>
            ) : closedWorkMs(day) <= 0 ? (
              <Text variant="muted">{t('clock.noPay')}</Text>
            ) : matched ? (
              <Text variant="muted">{t('clock.recorded')}</Text>
            ) : (
              <Button variant="outline" disabled={busy} onPress={() => review(day)}>
                {t('clock.post')}
              </Button>
            )}
          </View>
        )}
      </View>
    );
  };
  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between bg-card border-b border-border px-3 py-2">
        <Pressable
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('clock.previous')}
          className="p-3"
          onPress={before}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
            size={22}
            className="text-foreground"
          />
        </Pressable>
        <Pressable
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('clock.today')}
          onPress={() => setDate(today)}
        >
          <Text variant="large">{formatDate(date)}</Text>
        </Pressable>
        <Pressable
          disabled={date >= today || busy}
          accessibilityRole="button"
          accessibilityLabel={t('clock.next')}
          className="p-3"
          onPress={after}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
            size={22}
            className={date >= today ? 'text-muted-foreground' : 'text-foreground'}
          />
        </Pressable>
      </View>
      {!visible ? (
        <ActivityIndicator className="mt-8" />
      ) : visible.failed ? (
        <View className="p-5 gap-4">
          <Text>{t('clock.load')}</Text>
          <Button onPress={load}>{t('common.retry')}</Button>
        </View>
      ) : (
        <FlatList
          contentContainerClassName="p-4"
          data={visible.days.filter((day) => live || day.entries.length > 0)}
          keyExtractor={(day) => day.id}
          renderItem={renderDay}
          ListEmptyComponent={
            <Text className="text-center mt-8">{t(live ? 'clock.empty' : 'clock.emptyDay')}</Text>
          }
          ListFooterComponent={
            visible.days.some((day) => day.entries.length > 0) ? (
              <Text variant="muted" className="mb-4">
                {t('clock.split')}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}
