import { useState, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees, useAttendanceByDate, useRefresh } from '../../../src/hooks';
import { Employee, EmployeeStatus, AttendanceStatus, WageType } from '../../../src/models';
import { formatDate, getTodayString, toISODateString } from '../../../src/utils/dateUtils';
import { addDays, parseISO } from 'date-fns';
import { t } from '../../../src/i18n';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';

export default function AttendanceScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const { employees, loading: loadingEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const { attendance, loading: loadingAttendance, error, markAttendance, refresh } = useAttendanceByDate(selectedDate);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const { refreshing, onRefresh } = useRefresh(refresh);

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
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setSavingId(null);
    }
  }, [markAttendance]);

  const handleMarkAllPresent = async () => {
    setBulkSaving(true);
    try {
      for (const emp of employees) {
        const current = attendanceMap.get(emp.id);
        if (!current || current.status !== AttendanceStatus.PRESENT) {
          await handleMarkAttendance(
            emp.id,
            AttendanceStatus.PRESENT,
            emp.wageType === WageType.HOURLY ? 8 : undefined
          );
        }
      }
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
              { value: AttendanceStatus.PRESENT, label: t('attendance.present'), color: 'bg-emerald-500/15 text-emerald-700' },
              { value: AttendanceStatus.HALF_DAY, label: t('attendance.halfDay'), color: 'bg-amber-500/15 text-amber-700' },
              { value: AttendanceStatus.ABSENT, label: t('attendance.absent'), color: 'bg-red-500/15 text-red-700' },
            ].map((btn) => {
              const isActive = status === btn.value;
              return (
                <Pressable
                  key={btn.value}
                  onPress={() => handleMarkAttendance(item.id, btn.value, item.wageType === WageType.HOURLY ? 8 : undefined)}
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

          {item.wageType === WageType.HOURLY && status === AttendanceStatus.PRESENT && (
            <View className="flex-row items-center mt-3">
              <Text variant="muted" className="mr-2">
                {t('attendance.hoursWorked')}:
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                defaultValue={currentAttendance?.hoursWorked?.toString() || '8'}
	                onEndEditing={(e) => {
	                  const hours = parseFloat(e.nativeEvent.text) || 0;
	                  handleMarkAttendance(item.id, AttendanceStatus.PRESENT, hours);
	                }}
                className="w-20 h-9 rounded-md border border-border bg-background px-2 text-center text-foreground"
              />
            </View>
          )}
        </View>
      </View>
    );
  }, [attendanceMap, savingId, handleMarkAttendance]);

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
        <Pressable onPress={() => changeDate(-1)} className="p-2">
          <MaterialCommunityIcons name="chevron-left" size={28} className="text-foreground" />
        </Pressable>
        <Text variant="large" className="min-w-[140px] text-center font-semibold text-foreground">
          {formatDate(selectedDate)}
        </Text>
        <Pressable onPress={() => changeDate(1)} className="p-2">
          <MaterialCommunityIcons name="chevron-right" size={28} className="text-foreground" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between px-4 py-2 gap-2">
        <Button variant="outline" size="sm" onPress={() => setSelectedDate(getTodayString())}>
          {t('common.today')}
        </Button>
        <Button variant="secondary" size="sm" onPress={handleMarkAllPresent} isLoading={bulkSaving}>
          {t('attendance.markAllPresent')}
        </Button>
        <Button variant="ghost" size="sm" onPress={() => router.push('/attendance/history')}>
          {t('attendance.viewHistory')}
        </Button>
      </View>

      {localError || error ? (
        <View className="mx-4 mt-3 rounded-lg bg-destructive px-4 py-3">
          <Text className="text-destructive-foreground text-sm">{localError || error}</Text>
        </View>
      ) : null}

      {employees.length === 0 ? (
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
