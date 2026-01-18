import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useEmployees } from '../../../src/hooks';
import { EmployeeStatus, WageCalculation } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import {
  formatCurrency,
  formatDate,
  getWeekRange,
  getMonthRange,
} from '../../../src/utils/dateUtils';
import { calculateWagesForAllEmployees, getTotalWages } from '../../../src/services/WageCalculationService';
import { t } from '../../../src/i18n';
import { useAuth } from '../../../src/auth/useAuth';

type PeriodType = 'week' | 'month';

export default function WageSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { employees, loading: loadingEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [calculations, setCalculations] = useState<WageCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dateRange = useMemo(() => {
    return period === 'week' ? getWeekRange() : getMonthRange();
  }, [period]);

  const loadWages = useCallback(async () => {
    if (!user || employees.length === 0) {
      setCalculations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const results = await calculateWagesForAllEmployees(
        user.id,
        employees,
        dateRange.start,
        dateRange.end
      );
      setCalculations(results);
    } catch (error) {
      console.error('Failed to calculate wages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, employees, dateRange]);

  useEffect(() => {
    loadWages();
  }, [loadWages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWages();
    setRefreshing(false);
  }, [loadWages]);

  const totalWages = useMemo(() => getTotalWages(calculations), [calculations]);
  const totalDaysWorked = useMemo(
    () =>
      calculations.reduce(
        (sum, calc) => sum + calc.totalDaysPresent + calc.totalHalfDays * 0.5,
        0
      ),
    [calculations]
  );

  const renderWageCard = ({ item }: { item: WageCalculation }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/wages/${item.employeeId}`)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={styles.name}>
              {item.employeeName}
            </Text>
            <Text variant="bodySmall" style={styles.details}>
              {item.totalDaysPresent} {t('wages.daysPresent')} • {item.totalHalfDays} {t('wages.halfDays')}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.wage}>
            {formatCurrency(item.totalWage)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if ((loadingEmployees || loading) && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as PeriodType)}
          buttons={[
            { value: 'week', label: t('wages.thisWeek') },
            { value: 'month', label: t('wages.thisMonth') },
          ]}
        />
        <Text variant="bodySmall" style={styles.dateRange}>
          {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
        </Text>
      </View>

      <Surface style={styles.summaryCard} elevation={2}>
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            {t('wages.totalWages')}
          </Text>
          <Text variant="headlineSmall" style={styles.summaryValue}>
            {formatCurrency(totalWages)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            {t('wages.daysWorked')}
          </Text>
          <Text variant="headlineSmall" style={styles.summaryValue}>
            {totalDaysWorked.toFixed(1)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text variant="bodySmall" style={styles.summaryLabel}>
            {t('wages.employees')}
          </Text>
          <Text variant="headlineSmall" style={styles.summaryValue}>
            {calculations.length}
          </Text>
        </View>
      </Surface>

      {calculations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('wages.noWageData')}</Text>
          <Text style={styles.emptySubtext}>
            {t('wages.noWageDataHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={calculations}
          keyExtractor={(item) => item.employeeId}
          renderItem={renderWageCard}
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
  periodSelector: {
    padding: sizes.padding,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateRange: {
    textAlign: 'center',
    marginTop: sizes.paddingSmall,
    color: colors.textSecondary,
  },
  summaryCard: {
    flexDirection: 'row',
    margin: sizes.padding,
    padding: sizes.padding,
    borderRadius: sizes.borderRadius,
    backgroundColor: colors.surface,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: sizes.paddingSmall,
  },
  summaryLabel: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  card: {
    marginBottom: sizes.paddingSmall,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  details: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  wage: {
    fontWeight: 'bold',
    color: colors.success,
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
