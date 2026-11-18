import { isClosedPeriodError } from '../../../src/database/repositories/FrozenWageRepository';
import { useState, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, Pressable, TextInput, ActivityIndicator, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees, useAttendanceByDate, useRefresh } from '../../../src/hooks';
import { Employee, EmployeeStatus, AttendanceStatus, WageType } from '../../../src/models';
import { formatDate, getTodayString, toISODateString } from '../../../src/utils/dateUtils';
import { addDays, parseISO } from 'date-fns';
import { t } from '../../../src/i18n';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';
import { parseLocalizedDecimal } from '../../../src/utils/numberUtils';

function ShiftHoursInput({ savedHours, disabled, onSave }: {
  savedHours?: number;
  disabled: boolean;
  onSave: (hours: number) => Promise<boolean>;
}) {
  const savedText = savedHours?.toString() ?? '';
  const [draft, setDraft] = useState(savedText);

  return (
    <View className="flex-row items-center gap-2 mt-3">
      <Text variant="muted">{t('attendance.hoursWorked')}</Text>
      <TextInput
        accessibilityLabel={t('attendance.hoursWorked')}
        keyboardType="decimal-pad"
        selectTextOnFocus
        editable={!disabled}
        value={draft}
        onChangeText={setDraft}
        onEndEditing={async event => {
          const hours = parseLocalizedDecimal(event.nativeEvent.text);
          if (hours !== savedHours && !(await onSave(hours))) setDraft(savedText);
        }}
        className="w-20 h-10 rounded-md border border-border bg-background px-2 text-center text-foreground"
      />
    </View>
  );
}

export default function AttendanceScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const { employees, loading: loadingEmployees, error: employeeError, refresh: refreshEmployees } = useEmployees(EmployeeStatus.ACTIVE, selectedDate);
  const { attendance, loading: loadingAttendance, error, markAttendance, refresh } = useAttendanceByDate(selectedDate);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const { refreshing, onRefresh } = useRefresh(async () => {
    await Promise.all([refresh(), refreshEmployees()]);
  });

  const attendanceMap = useMemo(() => {
    const map = new Map<string, { status: AttendanceStatus; hoursWorked?: number }>();
    for (const record of attendance) {
      map.set(record.employeeId, {
        status: record.status,
        hoursWorked: record.hoursWorked,
      });
    }
    return map;
  }, [attendance]);

  const changeDate = (days: number) => {
    setLocalError('');
    const current = parseISO(selectedDate);
    const newDate = addDays(current, days);
    setSelectedDate(toISODateString(newDate));
  };

  const handleMarkAttendance = useCallback(async (
    employeeId: string,
    status: AttendanceStatus,
    hoursWorked?: number
  ) => {
    setSavingId(employeeId);
    try {
      setLocalError('');
      await markAttendance(employeeId, status, hoursWorked);
      return true;
    } catch (error) {
      setLocalError(isClosedPeriodError(error) ? t('periods.locked') : error instanceof Error ? error.message : t('common.error'));
      return false;
    } finally {
      setSavingId(null);
    }
  }, [markAttendance]);

  const handleMarkAllPresent = async () => {
    setBulkSaving(true);
    setLocalError('');
    try {
      for (const emp of employees) {
        const current = attendanceMap.get(emp.id);
        if (!current || current.status !== AttendanceStatus.PRESENT) {
          await markAttendance(emp.id, AttendanceStatus.PRESENT);
        }
      }
    } catch (error) {
      setLocalError(isClosedPeriodError(error) ? t('periods.locked') : error instanceof Error ? error.message : t('common.error'));
    } finally {
      setBulkSaving(false);
    }
  };

  const renderEmployee = useCallback(({ item }: { item: Employee }) => {
    const currentAttendance = attendanceMap.get(item.id);
    const isSaving = savingId === item.id;
    const status = currentAttendance?.status;

    return (
      <View className="mb-3 rounded-xl border border-border bg-card overflow-hidden">
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text variant="large" className="font-semibold text-foreground">
                {item.name}
              </Text>
              <Text variant="muted" className="mt-0.5">
                {item.role} • {item.wageType === WageType.DAILY ? t('attendance.daily') : t('attendance.hourly')}
              </Text>
            </View>
            {isSaving && <ActivityIndicator size="small" color="#3b82f6" />}
          </View>

          <View className="flex-row gap-2">
            {[
              { value: AttendanceStatus.PRESENT, label: t('attendance.present') },
              { value: AttendanceStatus.HALF_DAY, label: t('attendance.halfDay') },
              { value: AttendanceStatus.ABSENT, label: t('attendance.absent') },
            ].map((btn) => {
              const isActive = status === btn.value;
              return (
                <Pressable
                  key={btn.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive, disabled: isActive || !!savingId || bulkSaving }}
                  disabled={isActive || !!savingId || bulkSaving}
                  onPress={() => handleMarkAttendance(item.id, btn.value)}
                  className={`flex-1 py-2.5 rounded-lg items-center justify-center border ${
                    isActive ? 'bg-primary border-primary' : 'bg-card border-border'
                  }`}
                >
                  <Text className={`text-sm font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                    {btn.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {item.wageType === WageType.HOURLY && status && status !== AttendanceStatus.ABSENT && (
            <ShiftHoursInput
              key={`${selectedDate}-${status}-${currentAttendance?.hoursWorked}`}
              savedHours={currentAttendance?.hoursWorked}
              disabled={!!savingId || bulkSaving}
              onSave={hours => handleMarkAttendance(item.id, status, hours)}
            />
          )}
        </View>
      </View>
    );
  }, [attendanceMap, savingId, bulkSaving, selectedDate, handleMarkAttendance]);

  const loading = loadingEmployees || loadingAttendance;

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-center py-3 bg-card border-b border-border">
        <Pressable accessibilityRole="button" accessibilityLabel={t('attendance.previousDay')} disabled={!!savingId || bulkSaving} onPress={() => changeDate(-1)} className="p-2">
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={28} className="text-foreground" />
        </Pressable>
        <Text variant="large" className="min-w-[140px] text-center font-semibold text-foreground">
          {formatDate(selectedDate)}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('attendance.nextDay')} disabled={!!savingId || bulkSaving} onPress={() => changeDate(1)} className="p-2">
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={28} className="text-foreground" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between px-4 py-2 gap-2">
        <Button variant="outline" size="sm" disabled={!!savingId || bulkSaving} onPress={() => setSelectedDate(getTodayString())}>
          {t('common.today')}
        </Button>
        <Button variant="secondary" size="sm" onPress={handleMarkAllPresent} disabled={!!savingId || !employees.length} isLoading={bulkSaving}>
          {t('attendance.markAllPresent')}
        </Button>
        <Button variant="ghost" size="sm" onPress={() => router.push('/attendance/history')}>
          {t('attendance.viewHistory')}
        </Button>
      </View>

      {localError || error || employeeError ? (
        <View className="mx-4 mt-3 rounded-lg bg-destructive px-4 py-3">
          <Text className="text-destructive-foreground text-sm">{localError || error || employeeError}</Text>
        </View>
      ) : null}

      {employeeError || error ? (
        <Button variant="outline" onPress={onRefresh}>{t('common.retry')}</Button>
      ) : employees.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text variant="h4" className="text-center text-muted-foreground mb-2">
            {t('attendance.noActiveEmployees')}
          </Text>
          <Text variant="muted" className="text-center">
            {t('attendance.noActiveEmployeesHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployee}
          contentContainerClassName="px-4 pb-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
