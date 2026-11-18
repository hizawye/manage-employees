import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { useAuth } from '../../src/auth/useAuth';
import { Button } from '../../src/components/ui/button';
import { Text } from '../../src/components/ui/text';
import { Availability } from '../../src/components/workforce/Availability';
import { ShiftTemplates } from '../../src/components/workforce/ShiftTemplates';
import { ShiftEditor, shiftError } from '../../src/components/workforce/ShiftEditor';
import { getAllEmployees } from '../../src/database/repositories/EmployeeRepository';
import { getLocale, t } from '../../src/i18n';
import { Employee, EmployeeStatus } from '../../src/models';
import { getWeekRange, formatDateShort, getTodayString } from '../../src/utils/dateUtils';
import { WorkShift, copyPreviousWeek, getShiftsInRange, shiftDay } from '../../src/services/WorkShiftService';

type Week = { start: string; shifts: WorkShift[]; staff: Employee[] };

export default function ScheduleScreen() {
  const owner = useAuth().user?.id;
  return owner === undefined ? null : <Roster owner={owner} key={owner} />;
}

function Roster({ owner }: { owner: number }) {
  const [start, setStart] = useState(() => getWeekRange().start);
  const end = shiftDay(start, 6);
  const [week, setWeek] = useState<Week>();
  const [loadError, setLoadError] = useState(false);
  const [editor, setEditor] = useState<{ date: string; shift?: WorkShift }>();
  const [showAvailability, setShowAvailability] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyLock = useRef(false);
  const [message, setMessage] = useState('');
  const version = useRef(0);
  const reload = useCallback(async () => {
    const ticket = ++version.current;
    setLoadError(false);
    try {
      const [shifts, staff] = await Promise.all([
        getShiftsInRange(owner, start, end, true),
        getAllEmployees(owner, EmployeeStatus.ACTIVE),
      ]);
      if (ticket === version.current) setWeek({ start, shifts, staff });
    } catch {
      if (ticket === version.current) {
        setWeek(undefined);
        setLoadError(true);
      }
    }
  }, [owner, start, end]);
  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        version.current++;
      };
    }, [reload])
  );

  function navigate(target: string) {
    setMessage('');
    setLoadError(false);
    setStart(target);
  }
  const confirmCopy = () =>
    Alert.alert(t('schedule.copyTitle'), t('schedule.copyBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('schedule.copy'),
        onPress: async () => {
          if (copyLock.current) return;
          copyLock.current = true;
          setCopying(true);
          try {
            const count = await copyPreviousWeek(owner, start);
            setMessage(count ? t('schedule.copied', { count }) : t('schedule.noneCopied'));
            await reload();
          } catch (cause) {
            setMessage(shiftError(cause));
          } finally {
            copyLock.current = false;
            setCopying(false);
          }
        },
      },
    ]);

  const data = week?.start === start ? week : undefined;
  const weekdays = new Intl.DateTimeFormat(getLocale(), { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border px-3 py-2 bg-card">
        <View className="flex-row justify-between items-center">
          {(['prev', 'current', 'next'] as const).map((side) =>
            side === 'current' ? (
              <Pressable
                key={side}
                accessibilityRole="button"
                accessibilityLabel={t('schedule.thisWeek')}
                disabled={copying}
                onPress={() => navigate(getWeekRange().start)}
                className="p-2"
              >
                <Text variant="large">
                  {formatDateShort(start)} – {formatDateShort(end)}
                </Text>
              </Pressable>
            ) : (
              <Button
                key={side}
                variant="ghost"
                size="icon"
                disabled={copying}
                accessibilityLabel={t(side === 'prev' ? 'schedule.prevWeek' : 'schedule.nextWeek')}
                onPress={() => navigate(shiftDay(start, side === 'prev' ? -7 : 7))}
              >
                <MaterialCommunityIcons
                  name={(side === 'next') !== I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
                  size={26}
                  className="text-foreground"
                />
              </Button>
            )
          )}
        </View>
        <View className="flex-row flex-wrap gap-2 justify-center">
          <Button variant="outline" disabled={!data?.staff.length} isLoading={copying} onPress={confirmCopy}>
            {t('schedule.copy')}
          </Button>
          <Button variant="outline" disabled={!data || copying} onPress={() => setShowAvailability(true)}>
            {t('schedule.availability')}
          </Button>
          <Button variant="secondary" disabled={!data || copying} onPress={() => setShowTemplates(true)}>
            {t('schedule.templates')}
          </Button>
        </View>
      </View>
      {loadError ? (
        <View className="p-5 gap-3">
          <Text>{t('schedule.loadError')}</Text>
          <Button onPress={reload}>{t('common.retry')}</Button>
        </View>
      ) : !data ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-3 pb-10">
          {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
          {!data.staff.length && <Text variant="muted">{t('schedule.noStaff')}</Text>}
          {Array.from({ length: 7 }, (_, offset) => {
            const date = shiftDay(start, offset);
            const dayLabel = weekdays.format(parseISO(date));
            const dayShifts = data.shifts.filter(
              (item) =>
                item.startAt.slice(0, 10) === date || (offset === 0 && item.startAt.slice(0, 10) < start)
            );
            return (
              <View key={date} className="rounded-xl border border-border bg-card px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text variant="large" className={date === getTodayString() ? 'text-primary' : ''}>
                    {dayLabel}
                  </Text>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={!data.staff.length}
                    accessibilityLabel={t('schedule.add') + ' · ' + dayLabel}
                    onPress={() => setEditor({ date })}
                  >
                    <MaterialCommunityIcons name="plus" size={22} className="text-primary" />
                  </Button>
                </View>
                {!dayShifts.length && <Text variant="muted">{t('schedule.emptyDay')}</Text>}
                {dayShifts.map((item) => {
                  const overnight = item.startAt.slice(0, 10) !== item.endAt.slice(0, 10);
                  const carryIn = item.startAt.slice(0, 10) < start;
                  const span =
                    (carryIn ? formatDateShort(item.startAt.slice(0, 10)) + ' ' : '') +
                    item.startAt.slice(11) +
                    ' – ' +
                    item.endAt.slice(11) +
                    (overnight ? ' · ' + t('schedule.nextDay') : '');
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={[item.employeeName, span, t('schedule.edit')].join(' · ')}
                      onPress={() => setEditor({ date, shift: item })}
                      className="border-t border-border py-3 mt-1"
                    >
                      <Text variant="label">
                        {item.employeeName}
                        {item.employeeStatus === 'inactive' ? ' · ' + t('schedule.inactiveLabel') : ''}
                      </Text>
                      <Text>{span}</Text>
                      {(!!item.role || !!item.location) && (
                        <Text variant="muted">{[item.role, item.location].filter(Boolean).join(' · ')}</Text>
                      )}
                      {!!item.notes && (
                        <Text variant="muted" numberOfLines={2}>
                          {item.notes}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
      {showAvailability && data && (
        <Availability owner={owner} staff={data.staff} dismiss={() => setShowAvailability(false)} />
      )}
      {showTemplates && (
        <ShiftTemplates
          owner={owner}
          week={start}
          dismiss={() => setShowTemplates(false)}
          applied={(count) => {
            setShowTemplates(false);
            setMessage(count ? t('schedule.copied', { count }) : t('schedule.noneCopied'));
            void reload();
          }}
        />
      )}
      {editor && data && (
        <ShiftEditor
          owner={owner}
          staff={data.staff}
          {...editor}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined);
            setMessage('');
            void reload();
          }}
        />
      )}
    </View>
  );
}
