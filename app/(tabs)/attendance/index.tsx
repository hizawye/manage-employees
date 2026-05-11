import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  ActivityIndicator,
  SegmentedButtons,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees, useAttendanceByDate, useRefresh } from '../../../src/hooks';
import { Employee, EmployeeStatus, AttendanceStatus, WageType } from '../../../src/models';
import { sizes, colors as staticColors } from '../../../src/constants/theme';
import { formatDate, getTodayString, toISODateString } from '../../../src/utils/dateUtils';
import { addDays, parseISO } from 'date-fns';
import { t } from '../../../src/i18n';

export default function AttendanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const { employees, loading: loadingEmployees, refresh: refreshEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const { attendance, loading: loadingAttendance, markAttendance, refresh } = useAttendanceByDate(selectedDate);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Refresh employees when screen comes into focus
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

    return (
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        <Card.Content>
          <View style={styles.employeeHeader}>
            <View style={styles.employeeInfo}>
              <Text variant="titleMedium" style={styles.name}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={[styles.role, { color: colors.onSurfaceVariant }]}>
                {item.role} • {item.wageType === WageType.DAILY ? t('attendance.daily') : t('attendance.hourly')}
              </Text>
            </View>
            {isSaving && <ActivityIndicator size="small" />}
          </View>

          <View style={styles.statusButtons}>
            <SegmentedButtons
              value={currentAttendance?.status || ''}
              onValueChange={(value) =>
                handleMarkAttendance(
                  item.id,
                  value as AttendanceStatus,
                  item.wageType === WageType.HOURLY ? 8 : undefined
                )
              }
              buttons={[
                {
                  value: AttendanceStatus.PRESENT,
                  label: t('attendance.present'),
                  style: currentAttendance?.status === AttendanceStatus.PRESENT
                    ? { backgroundColor: staticColors.present + '20' }
                    : undefined,
                },
                {
                  value: AttendanceStatus.HALF_DAY,
                  label: t('attendance.halfDay'),
                  style: currentAttendance?.status === AttendanceStatus.HALF_DAY
                    ? { backgroundColor: staticColors.halfDay + '20' }
                    : undefined,
                },
                {
                  value: AttendanceStatus.ABSENT,
                  label: t('attendance.absent'),
                  style: currentAttendance?.status === AttendanceStatus.ABSENT
                    ? { backgroundColor: staticColors.absent + '20' }
                    : undefined,
                },
              ]}
            />
          </View>

          {item.wageType === WageType.HOURLY && currentAttendance?.status === AttendanceStatus.PRESENT && (
            <View style={styles.hoursContainer}>
              <Text variant="bodySmall" style={[styles.hoursLabel, { color: colors.onSurfaceVariant }]}>
                {t('attendance.hoursWorked')}:
              </Text>
              <TextInput
                mode="outlined"
                dense
                keyboardType="decimal-pad"
                value={currentAttendance?.hoursWorked?.toString() || '8'}
                onChangeText={(text) => {
                  const hours = parseFloat(text) || 0;
                  handleMarkAttendance(item.id, AttendanceStatus.PRESENT, hours);
                }}
                style={styles.hoursInput}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    );
  }, [attendanceMap, savingId, handleMarkAttendance]);

  const loading = loadingEmployees || loadingAttendance;

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.dateSelector, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
        <IconButton
          icon="chevron-left"
          size={28}
          onPress={() => changeDate(-1)}
        />
        <Text variant="titleMedium" style={styles.dateText}>
          {formatDate(selectedDate)}
        </Text>
        <IconButton
          icon="chevron-right"
          size={28}
          onPress={() => changeDate(1)}
        />
      </View>

      <View style={styles.quickActions}>
        <Button
          mode="outlined"
          compact
          onPress={() => setSelectedDate(getTodayString())}
          style={styles.todayButton}
        >
          {t('common.today')}
        </Button>
        <Button
          mode="contained-tonal"
          compact
          onPress={handleMarkAllPresent}
          icon="check-all"
        >
          {t('attendance.markAllPresent')}
        </Button>
        <Button
          mode="text"
          compact
          onPress={() => router.push('/attendance/history')}
        >
          {t('attendance.viewHistory')}
        </Button>
      </View>

      {employees.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>{t('attendance.noActiveEmployees')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>
            {t('attendance.noActiveEmployeesHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployee}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sizes.padding,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sizes.paddingSmall,
    borderBottomWidth: 1,
  },
  dateText: {
    minWidth: 140,
    textAlign: 'center',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: sizes.paddingSmall,
    paddingHorizontal: sizes.padding,
    gap: 6,
  },
  todayButton: {
    borderRadius: sizes.borderRadius,
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  card: {
    marginBottom: sizes.paddingSmall,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: sizes.paddingSmall,
  },
  employeeInfo: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  role: {
    marginTop: 2,
  },
  statusButtons: {
    marginTop: sizes.paddingSmall,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sizes.paddingSmall,
  },
  hoursLabel: {
    marginRight: sizes.paddingSmall,
  },
  hoursInput: {
    width: 80,
    height: 36,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
});
