import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  Chip,
} from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useEmployee } from '../../../src/hooks';
import { WageCalculation, WageDetail, AttendanceStatus, WageType } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import {
  formatCurrency,
  formatDateShort,
  getWeekRange,
  getMonthRange,
} from '../../../src/utils/dateUtils';
import { calculateWagesForPeriod } from '../../../src/services/WageCalculationService';

type PeriodType = 'week' | 'month';

export default function EmployeeWageDetailScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { employee, loading: loadingEmployee } = useEmployee(employeeId);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [wageData, setWageData] = useState<WageCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dateRange = useMemo(() => {
    return period === 'week' ? getWeekRange() : getMonthRange();
  }, [period]);

  const loadWages = useCallback(async () => {
    if (!employee) {
      setWageData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await calculateWagesForPeriod(
        employee,
        dateRange.start,
        dateRange.end
      );
      setWageData(result);
    } catch (error) {
      console.error('Failed to calculate wages:', error);
    } finally {
      setLoading(false);
    }
  }, [employee, dateRange]);

  useEffect(() => {
    loadWages();
  }, [loadWages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWages();
    setRefreshing(false);
  }, [loadWages]);

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
        return 'Present';
      case AttendanceStatus.HALF_DAY:
        return 'Half Day';
      case AttendanceStatus.ABSENT:
        return 'Absent';
      default:
        return status;
    }
  };

  const renderWageDetail = ({ item }: { item: WageDetail }) => (
    <Card style={styles.detailCard}>
      <Card.Content style={styles.detailContent}>
        <View style={styles.detailInfo}>
          <Text variant="bodyMedium" style={styles.detailDate}>
            {formatDateShort(item.date)}
          </Text>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {getStatusLabel(item.status)}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.detailWage}>
          {formatCurrency(item.wageEarned)}
        </Text>
      </Card.Content>
    </Card>
  );

  if ((loadingEmployee || loading) && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!employee || !wageData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Employee not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.employeeName}>
          {employee.name}
        </Text>
        <Text variant="bodyMedium" style={styles.employeeInfo}>
          {employee.role} • {employee.wageType === WageType.DAILY ? 'Daily' : 'Hourly'}: {formatCurrency(employee.wageRate)}
        </Text>
      </View>

      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as PeriodType)}
          buttons={[
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
          ]}
        />
      </View>

      <Surface style={styles.summaryCard} elevation={2}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              Total Wage
            </Text>
            <Text variant="headlineSmall" style={styles.totalWage}>
              {formatCurrency(wageData.totalWage)}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.present }]}>
              {wageData.totalDaysPresent}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Present
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.halfDay }]}>
              {wageData.totalHalfDays}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Half Days
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.absent }]}>
              {wageData.totalDaysAbsent}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Absent
            </Text>
          </View>
          {employee.wageType === WageType.HOURLY && (
            <View style={styles.statItem}>
              <Text variant="titleMedium" style={styles.statValue}>
                {wageData.totalHoursWorked?.toFixed(1) || 0}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Hours
              </Text>
            </View>
          )}
        </View>
      </Surface>

      <Text variant="titleSmall" style={styles.breakdownTitle}>
        Daily Breakdown
      </Text>

      {wageData.details.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance records</Text>
        </View>
      ) : (
        <FlatList
          data={wageData.details}
          keyExtractor={(item) => item.date}
          renderItem={renderWageDetail}
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
  header: {
    padding: sizes.padding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  employeeName: {
    fontWeight: 'bold',
  },
  employeeInfo: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  periodSelector: {
    padding: sizes.padding,
  },
  summaryCard: {
    margin: sizes.padding,
    marginTop: 0,
    padding: sizes.padding,
    borderRadius: sizes.borderRadius,
    backgroundColor: colors.surface,
  },
  summaryRow: {
    alignItems: 'center',
    marginBottom: sizes.padding,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  totalWage: {
    fontWeight: 'bold',
    color: colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: sizes.padding,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  breakdownTitle: {
    paddingHorizontal: sizes.padding,
    marginBottom: sizes.paddingSmall,
    color: colors.textSecondary,
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  detailCard: {
    marginBottom: sizes.paddingSmall,
    backgroundColor: colors.surface,
  },
  detailContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sizes.paddingSmall,
  },
  detailDate: {
    fontWeight: '500',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
  },
  detailWage: {
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sizes.padding,
  },
  emptyText: {
    color: colors.textSecondary,
  },
  error: {
    color: colors.error,
  },
});
