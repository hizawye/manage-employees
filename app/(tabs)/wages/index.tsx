import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  useTheme,
  Chip,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees, useRefresh } from '../../../src/hooks';
import { StatCard } from '../../../src/components';
import { EmployeeStatus, WageCalculation } from '../../../src/models';
import { sizes, colors as staticColors } from '../../../src/constants/theme';
import {
  formatCurrency,
  formatDate,
  getWeekRange,
  getMonthRange,
} from '../../../src/utils/dateUtils';
import { calculateWagesForAllEmployees, getTotalWages } from '../../../src/services/WageCalculationService';
import { PaymentService } from '../../../src/services/PaymentService';
import { t } from '../../../src/i18n';
import { useAuth } from '../../../src/auth/useAuth';

type PeriodType = 'week' | 'month';

interface WageWithPayment extends WageCalculation {
  paidAmount: number;
  remaining: number;
  isFullyPaid: boolean;
}

export default function WageSummaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { employees, loading: loadingEmployees, refresh: refreshEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [calculations, setCalculations] = useState<WageWithPayment[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch payment status for each employee
      const withPayments = await Promise.all(
        results.map(async (calc) => {
          const paid = await PaymentService.getPaidAmount(
            user.id,
            calc.employeeId,
            dateRange.start,
            dateRange.end
          );
          const remaining = Math.max(0, calc.totalWage - paid);
          return {
            ...calc,
            paidAmount: paid,
            remaining,
            isFullyPaid: remaining <= 0 && calc.totalWage > 0,
          };
        })
      );

      setCalculations(withPayments);
    } catch (error) {
      console.error('Failed to calculate wages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, employees, dateRange]);

  useEffect(() => {
    loadWages();
  }, [loadWages]);

  // Refresh employees when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshEmployees();
    }, [refreshEmployees])
  );

  const { refreshing, onRefresh } = useRefresh(loadWages);

  const totalWages = useMemo(() => getTotalWages(calculations), [calculations]);
  const totalDaysWorked = useMemo(
    () =>
      calculations.reduce(
        (sum, calc) => sum + calc.totalDaysPresent + calc.totalHalfDays * 0.5,
        0
      ),
    [calculations]
  );

  const renderWageCard = useCallback(({ item }: { item: WageWithPayment }) => (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/wages/${item.employeeId}`)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={styles.name}>
              {item.employeeName}
            </Text>
            <Text variant="bodySmall" style={[styles.details, { color: colors.onSurfaceVariant }]}>
              {item.totalDaysPresent} {t('wages.daysPresent')} • {item.totalHalfDays} {t('wages.halfDays')}
            </Text>
            {item.paidAmount > 0 && (
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {t('wages.paid')}: {formatCurrency(item.paidAmount)} • {t('wages.remaining')}: {formatCurrency(item.remaining)}
              </Text>
            )}
          </View>
          <View style={styles.wageColumn}>
            <Text variant="titleMedium" style={[styles.wage, { color: staticColors.success }]}>
              {formatCurrency(item.totalWage)}
            </Text>
            {item.totalWage > 0 && (
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: item.isFullyPaid ? staticColors.success + '20' : colors.error + '20' }
                ]}
                textStyle={{ color: item.isFullyPaid ? staticColors.success : colors.error, fontSize: 10 }}
              >
                {item.isFullyPaid ? t('wages.fullyPaid') : t('wages.remaining') + ' ' + formatCurrency(item.remaining)}
              </Chip>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  ), [router, colors]);

  if ((loadingEmployees || loading) && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.periodSelector, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as PeriodType)}
          buttons={[
            { value: 'week', label: t('wages.thisWeek') },
            { value: 'month', label: t('wages.thisMonth') },
          ]}
        />
        <Text variant="bodySmall" style={[styles.dateRange, { color: colors.onSurfaceVariant }]}>
          {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
        </Text>
      </View>

      <Surface style={[styles.summaryCard, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.statsGrid}>
          <StatCard
            value={formatCurrency(totalWages)}
            label={t('wages.totalWages')}
            color={staticColors.success}
            icon="cash-multiple"
          />
          <StatCard
            value={totalDaysWorked.toFixed(1)}
            label={t('wages.daysWorked')}
            color={colors.primary}
            icon="calendar-check"
          />
          <StatCard
            value={calculations.length}
            label={t('wages.employees')}
            icon="account-group"
          />
        </View>
      </Surface>

      {calculations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>{t('wages.noWageData')}</Text>
          <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sizes.padding,
  },
  periodSelector: {
    padding: sizes.padding,
    borderBottomWidth: 1,
  },
  dateRange: {
    textAlign: 'center',
    marginTop: sizes.paddingSmall,
  },
  summaryCard: {
    margin: sizes.padding,
    padding: sizes.padding,
    borderRadius: sizes.borderRadius,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: sizes.paddingSmall,
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  card: {
    marginBottom: sizes.paddingSmall,
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
    marginTop: 2,
  },
  wageColumn: {
    alignItems: 'flex-end',
  },
  wage: {
    fontWeight: 'bold',
  },
  statusChip: {
    marginTop: 4,
    height: 24,
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
