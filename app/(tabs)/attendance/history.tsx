import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { useEmployees } from '../../../src/hooks';
import { getAttendanceInRange } from '../../../src/database/repositories';
import { Attendance, AttendanceStatus, Employee, EmployeeStatus } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { formatDate, getWeekRange } from '../../../src/utils/dateUtils';
import { addWeeks } from 'date-fns';
import { useEffect } from 'react';
import { t } from '../../../src/i18n';

interface AttendanceWithEmployee extends Attendance {
  employeeName: string;
}

export default function AttendanceHistoryScreen() {
  const { employees } = useEmployees(EmployeeStatus.ACTIVE);
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    try {
      setLoading(true);
      const records = await getAttendanceInRange(dateRange.start, dateRange.end);
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
  }, [dateRange, employeeMap]);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendance();
    }
  }, [loadAttendance, employees.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  }, [loadAttendance]);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return colors.present;
      case AttendanceStatus.HALF_DAY:
        return colors.halfDay;
      case AttendanceStatus.ABSENT:
        return colors.absent;
      default:
        return colors.textLight;
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return t('attendance.present');
      case AttendanceStatus.HALF_DAY:
        return t('attendance.halfDay');
      case AttendanceStatus.ABSENT:
        return t('attendance.absent');
      default:
        return status;
    }
  };

  const renderAttendance = ({ item }: { item: AttendanceWithEmployee }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.info}>
          <Text variant="titleSmall" style={styles.name}>
            {item.employeeName}
          </Text>
          <Text variant="bodySmall" style={styles.date}>
            {formatDate(item.date)}
          </Text>
        </View>
        <Chip
          compact
          style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
          textStyle={styles.statusText}
        >
          {getStatusLabel(item.status)}
        </Chip>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekSelector}>
        <IconButton
          icon="chevron-left"
          size={28}
          onPress={() => setWeekOffset((prev) => prev - 1)}
        />
        <View style={styles.weekInfo}>
          <Text variant="titleSmall" style={styles.weekLabel}>
            {t('attendance.week')}
          </Text>
          <Text variant="bodySmall" style={styles.weekRange}>
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
          <Text style={styles.emptyText}>{t('attendance.noRecords')}</Text>
          <Text style={styles.emptySubtext}>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekInfo: {
    alignItems: 'center',
    minWidth: 200,
  },
  weekLabel: {
    fontWeight: '600',
  },
  weekRange: {
    color: colors.textSecondary,
  },
  list: {
    padding: sizes.padding,
  },
  card: {
    marginBottom: sizes.paddingSmall,
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    color: colors.textLight,
  },
});
