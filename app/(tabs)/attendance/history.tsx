import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, IconButton, useTheme } from 'react-native-paper';
import { useEmployees, useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components';
import { getAttendanceInRange } from '../../../src/database/repositories';
import { Attendance, AttendanceStatus, Employee, EmployeeStatus } from '../../../src/models';
import { sizes } from '../../../src/constants/theme';
import { formatDate, getWeekRange } from '../../../src/utils/dateUtils';
import { addWeeks } from 'date-fns';
import { useEffect } from 'react';
import { t } from '../../../src/i18n';

interface AttendanceWithEmployee extends Attendance {
  employeeName: string;
}

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { employees } = useEmployees(EmployeeStatus.ACTIVE);
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    const baseDate = addWeeks(new Date(), weekOffset);
    return getWeekRange(baseDate);
  }, [weekOffset]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [employees]);

  const loadAttendance = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const records = await getAttendanceInRange(user.id, dateRange.start, dateRange.end);
      const withNames = records.map((record) => ({
        ...record,
        employeeName: employeeMap.get(record.employeeId)?.name || 'Unknown',
      }));
      setAttendance(withNames);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, employeeMap]);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendance();
    }
  }, [loadAttendance, employees.length]);

  const { refreshing, onRefresh } = useRefresh(loadAttendance);

  const renderAttendance = useCallback(({ item }: { item: AttendanceWithEmployee }) => (
    <Card style={[styles.card, { backgroundColor: colors.surface }]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.info}>
          <Text variant="titleSmall" style={styles.name}>
            {item.employeeName}
          </Text>
          <Text variant="bodySmall" style={[styles.date, { color: colors.onSurfaceVariant }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        <StatusChip type="attendance" status={item.status} />
      </Card.Content>
    </Card>
  ), [colors]);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.weekSelector, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
        <IconButton
          icon="chevron-left"
          size={28}
          onPress={() => setWeekOffset((prev) => prev - 1)}
        />
        <View style={styles.weekInfo}>
          <Text variant="titleSmall" style={styles.weekLabel}>
            {t('attendance.week')}
          </Text>
          <Text variant="bodySmall" style={[styles.weekRange, { color: colors.onSurfaceVariant }]}>
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </Text>
        </View>
        <IconButton
          icon="chevron-right"
          size={28}
          onPress={() => setWeekOffset((prev) => prev + 1)}
          disabled={weekOffset >= 0}
        />
      </View>

      {attendance.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>{t('attendance.noRecords')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>
            {t('attendance.noRecordsHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.id}
          renderItem={renderAttendance}
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
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sizes.paddingSmall,
    borderBottomWidth: 1,
  },
  weekInfo: {
    alignItems: 'center',
    minWidth: 200,
  },
  weekLabel: {
    fontWeight: '600',
  },
  weekRange: {
  },
  list: {
    padding: sizes.padding,
  },
  card: {
    marginBottom: sizes.paddingSmall,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  date: {
    marginTop: 2,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
  },
});
