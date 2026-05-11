import { useState, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees, useAttendanceByDate, useRefresh } from '../../../src/hooks';
import { Employee, EmployeeStatus, AttendanceStatus, WageType } from '../../../src/models';
import { formatDate, getTodayString, toISODateString } from '../../../src/utils/dateUtils';
import { addDays, parseISO } from 'date-fns';
import { t } from '../../../src/i18n';
import { Card, CardContent } from '../../../src/components/ui/card';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';
import { Badge } from '../../../src/components/ui/badge';

export default function AttendanceScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const { employees, loading: loadingEmployees, refresh: refreshEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const { attendance, loading: loadingAttendance, markAttendance, refresh } = useAttendanceByDate(selectedDate);
  const [savingId, setSavingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshEmployees();
    }, [refreshEmployees])
  );

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

  const { refreshing, onRefresh } = useRefresh(refresh);

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
      await markAttendance(employeeId, status, hoursWorked);
    } finally {
      setSavingId(null);
    }
  }, [markAttendance]);

  const handleMarkAllPresent = async () => {
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
  };

  const renderEmployee = useCallback(({ item }: { item: Employee }) => {
    const currentAttendance = attendanceMap.get(item.id);
    const isSaving = savingId === item.id;
    const status = currentAttendance?.status;

    const statusButtons = [
      { value: AttendanceStatus.PRESENT, label: t('attendance.present'), color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
      { value: AttendanceStatus.HALF_DAY, label: t('attendance.halfDay'), color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
      { value: AttendanceStatus.ABSENT, label: t('attendance.absent'), color: 'bg-red-500/15 text-red-600 dark:text-red-400' },
    ];

    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <Text variant="large" className="font-semibold text-foreground">
                {item.name}
              </Text>
              <Text variant="muted" className="mt-0.5">
                {item.role} • {item.wageType === WageType.DAILY ? t('attendance.daily') : t('attendance.hourly')}
              </Text>
            </View>
            {isSaving && <ActivityIndicator size="small" className="text-primary" />}
          </View>

          <View className="flex-row gap-2">
            {statusButtons.map((btn) => {
              const isActive = status === btn.value;
              return (
                <Pressable
                  key={btn.value}
                  onPress={() =>
                    handleMarkAttendance(
                      item.id,
                      btn.value,
                      item.wageType === WageType.HOURLY ? 8 : undefined
                    )
                  }
                  className={`flex-1 py-2.5 rounded-lg items-center justify-center border ${
                    isActive
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isActive ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
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
        </CardContent>
      </Card>
    );
  }, [attendanceMap, savingId, handleMarkAttendance]);

  const loading = loadingEmployees || loadingAttendance;

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Date Selector */}
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

      {/* Quick Actions */}
      <View className="flex-row items-center justify-between px-4 py-2 gap-2">
        <Button variant="outline" size="sm" onPress={() => setSelectedDate(getTodayString())}>
          {t('common.today')}
        </Button>
        <Button variant="secondary" size="sm" onPress={handleMarkAllPresent}>
          {t('attendance.markAllPresent')}
        </Button>
        <Button variant="ghost" size="sm" onPress={() => router.push('/attendance/history')}>
          {t('attendance.viewHistory')}
        </Button>
      </View>

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
