import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useEmployee, useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components';
import { WageCalculation, WageDetail, WageType } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import {
  formatCurrency,
  formatDateShort,
  getWeekRange,
  getMonthRange,
} from '../../../src/utils/dateUtils';
import { calculateWagesForPeriod } from '../../../src/services/WageCalculationService';
import { t } from '../../../src/i18n';

type PeriodType = 'week' | 'month';

export default function EmployeeWageDetailScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { user } = useAuth();
  const { employee, loading: loadingEmployee } = useEmployee(employeeId);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [wageData, setWageData] = useState<WageCalculation | null>(null);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    return period === 'week' ? getWeekRange() : getMonthRange();
  }, [period]);

  const loadWages = useCallback(async () => {
    if (!employee || !user) {
      setWageData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await calculateWagesForPeriod(
        user.id,
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
  }, [employee, user, dateRange]);

  useEffect(() => {
    loadWages();
  }, [loadWages]);

  const { refreshing, onRefresh } = useRefresh(loadWages);

  const renderWageDetail = useCallback(({ item }: { item: WageDetail }) => (
    <Card style={styles.detailCard}>
      <Card.Content style={styles.detailContent}>
        <View style={styles.detailInfo}>
          <Text variant="bodyMedium" style={styles.detailDate}>
            {formatDateShort(item.date)}
          </Text>
          <StatusChip type="attendance" status={item.status} />
        </View>
        <Text variant="bodyMedium" style={styles.detailWage}>
          {formatCurrency(item.wageEarned)}
        </Text>
      </Card.Content>
    </Card>
  ), []);

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
        <Text style={styles.error}>{t('employee.employeeNotFound')}</Text>
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
          {employee.role} • {employee.wageType === WageType.DAILY ? t('attendance.daily') : t('attendance.hourly')}: {formatCurrency(employee.wageRate)}
        </Text>
      </View>

      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as PeriodType)}
          buttons={[
            { value: 'week', label: t('wages.thisWeek') },
            { value: 'month', label: t('wages.thisMonth') },
          ]}
        />
      </View>

      <Surface style={styles.summaryCard} elevation={2}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={styles.summaryLabel}>
              {t('wages.totalWage')}
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
              {t('wages.daysPresent')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.halfDay }]}>
              {wageData.totalHalfDays}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('wages.halfDays')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: colors.absent }]}>
              {wageData.totalDaysAbsent}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t('wages.daysAbsent')}
            </Text>
          </View>
          {employee.wageType === WageType.HOURLY && (
            <View style={styles.statItem}>
              <Text variant="titleMedium" style={styles.statValue}>
                {wageData.totalHoursWorked?.toFixed(1) || 0}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                {t('wages.hours')}
              </Text>
            </View>
          )}
        </View>
      </Surface>

      <Text variant="titleSmall" style={styles.breakdownTitle}>
        {t('wages.dailyBreakdown')}
      </Text>

      {wageData.details.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('wages.noAttendanceRecords')}</Text>
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
