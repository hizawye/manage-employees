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
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useEmployees, useAttendanceByDate } from '../../../src/hooks';
import { Employee, EmployeeStatus, AttendanceStatus, WageType } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { formatDate, getTodayString, toISODateString } from '../../../src/utils/dateUtils';
import { addDays, parseISO } from 'date-fns';

export default function AttendanceScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const { employees, loading: loadingEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const { attendance, loading: loadingAttendance, markAttendance, refresh } = useAttendanceByDate(selectedDate);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    const newDate = addDays(current, days);
    setSelectedDate(toISODateString(newDate));
  };

  const handleMarkAttendance = async (
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
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const currentAttendance = attendanceMap.get(item.id);
    const isSaving = savingId === item.id;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.employeeHeader}>
            <View style={styles.employeeInfo}>
              <Text variant="titleMedium" style={styles.name}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.role}>
                {item.role} • {item.wageType === WageType.DAILY ? 'Daily' : 'Hourly'}
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
                  label: 'Present',
                  style: currentAttendance?.status === AttendanceStatus.PRESENT
                    ? { backgroundColor: colors.present + '20' }
                    : undefined,
                },
                {
                  value: AttendanceStatus.HALF_DAY,
                  label: 'Half Day',
                  style: currentAttendance?.status === AttendanceStatus.HALF_DAY
                    ? { backgroundColor: colors.halfDay + '20' }
                    : undefined,
                },
                {
                  value: AttendanceStatus.ABSENT,
                  label: 'Absent',
                  style: currentAttendance?.status === AttendanceStatus.ABSENT
                    ? { backgroundColor: colors.absent + '20' }
                    : undefined,
                },
              ]}
            />
          </View>

          {item.wageType === WageType.HOURLY && currentAttendance?.status === AttendanceStatus.PRESENT && (
            <View style={styles.hoursContainer}>
              <Text variant="bodySmall" style={styles.hoursLabel}>
                Hours Worked:
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
  };

  const loading = loadingEmployees || loadingAttendance;

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateSelector}>
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
          Today
        </Button>
        <Button
          mode="text"
          compact
          onPress={() => router.push('/attendance/history')}
        >
          View History
        </Button>
      </View>

      {employees.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No active employees</Text>
          <Text style={styles.emptySubtext}>
            Add employees from the Employees tab first
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateText: {
    minWidth: 140,
    textAlign: 'center',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: sizes.paddingSmall,
    paddingHorizontal: sizes.padding,
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
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  hoursInput: {
    width: 80,
    height: 36,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    color: colors.textLight,
    textAlign: 'center',
  },
});
