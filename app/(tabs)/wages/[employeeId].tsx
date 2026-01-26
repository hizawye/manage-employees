import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  useTheme,
} from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useEmployee, useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components';
import { WageCalculation, WageDetail, WageType } from '../../../src/models';
import { sizes, colors as staticColors } from '../../../src/constants/theme';
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
  const { colors } = useTheme();
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
    <Card style={[styles.detailCard, { backgroundColor: colors.surface }]}>
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
  ), [colors]);

  if ((loadingEmployee || loading) && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!employee || !wageData) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.error, { color: colors.error }]}>{t('employee.employeeNotFound')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
        <Text variant="titleLarge" style={styles.employeeName}>
          {employee.name}
        </Text>
        <Text variant="bodyMedium" style={[styles.employeeInfo, { color: colors.onSurfaceVariant }]}>
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

      <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>
              {t('wages.totalWage')}
            </Text>
            <Text variant="headlineSmall" style={[styles.totalWage, { color: staticColors.success }]}>
              {formatCurrency(wageData.totalWage)}
            </Text>
          </View>
        </View>
        <View style={[styles.statsRow, { borderTopColor: colors.outline }]}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: staticColors.present }]}>
              {wageData.totalDaysPresent}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              {t('wages.daysPresent')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: staticColors.halfDay }]}>
              {wageData.totalHalfDays}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              {t('wages.halfDays')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={[styles.statValue, { color: staticColors.absent }]}>
              {wageData.totalDaysAbsent}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
              {t('wages.daysAbsent')}
            </Text>
          </View>
          {employee.wageType === WageType.HOURLY && (
            <View style={styles.statItem}>
              <Text variant="titleMedium" style={styles.statValue}>
                {wageData.totalHoursWorked?.toFixed(1) || 0}
              </Text>
              <Text variant="bodySmall" style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                {t('wages.hours')}
              </Text>
            </View>
          )}
        </View>
      </Surface>

      <Text variant="titleSmall" style={[styles.breakdownTitle, { color: colors.onSurfaceVariant }]}>
        {t('wages.dailyBreakdown')}
      </Text>

      {wageData.details.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>{t('wages.noAttendanceRecords')}</Text>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sizes.padding,
  },
  header: {
    padding: sizes.padding,
    borderBottomWidth: 1,
  },
  employeeName: {
    fontWeight: 'bold',
  },
  employeeInfo: {
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
  },
  summaryRow: {
    alignItems: 'center',
    marginBottom: sizes.padding,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    marginBottom: 4,
  },
  totalWage: {
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: sizes.padding,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
  },
  statLabel: {
    marginTop: 2,
  },
  breakdownTitle: {
    paddingHorizontal: sizes.padding,
    marginBottom: sizes.paddingSmall,
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  detailCard: {
    marginBottom: sizes.paddingSmall,
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
  },
  error: {
  },
});
