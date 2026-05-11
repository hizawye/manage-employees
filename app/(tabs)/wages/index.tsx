import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees, useRefresh } from '../../../src/hooks';
import { StatCard } from '../../../src/components';
import { EmployeeStatus, WageCalculation } from '../../../src/models';
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
import { Card, CardContent } from '../../../src/components/ui/card';
import { Text } from '../../../src/components/ui/text';
import { Badge } from '../../../src/components/ui/badge';

type PeriodType = 'week' | 'month';

interface WageWithPayment extends WageCalculation {
  paidAmount: number;
  remaining: number;
  isFullyPaid: boolean;
}

export default function WageSummaryScreen() {
  const router = useRouter();
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
    <Pressable onPress={() => router.push(`/wages/${item.employeeId}`)}>
      <Card className="mb-3">
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text variant="large" className="font-semibold text-foreground">
                {item.employeeName}
              </Text>
              <Text variant="muted" className="mt-0.5">
                {item.totalDaysPresent} {t('wages.daysPresent')} • {item.totalHalfDays} {t('wages.halfDays')}
              </Text>
              {item.paidAmount > 0 && (
                <Text variant="muted" className="mt-0.5">
                  {t('wages.paid')}: {formatCurrency(item.paidAmount)} • {t('wages.remaining')}: {formatCurrency(item.remaining)}
                </Text>
              )}
            </View>
            <View className="items-end">
              <Text variant="large" className="font-bold text-emerald-500">
                {formatCurrency(item.totalWage)}
              </Text>
              {item.totalWage > 0 && (
                <Badge
                  variant={item.isFullyPaid ? 'success' : 'destructive'}
                  className="mt-1"
                >
                  {item.isFullyPaid ? t('wages.fullyPaid') : t('wages.remaining') + ' ' + formatCurrency(item.remaining)}
                </Badge>
              )}
            </View>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  ), [router]);

  if ((loadingEmployees || loading) && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Period Selector */}
      <View className="px-4 py-4 bg-card border-b border-border">
        <View className="flex-row rounded-lg border border-border bg-background overflow-hidden">
          {(['week', 'month'] as PeriodType[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              className={`flex-1 py-2.5 items-center justify-center ${
                period === p ? 'bg-primary' : 'bg-background'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  period === p ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {p === 'week' ? t('wages.thisWeek') : t('wages.thisMonth')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text variant="muted" className="text-center mt-2">
          {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
        </Text>
      </View>

      {/* Summary */}
      <Card className="mx-4 mt-4 mb-2">
        <CardContent className="p-4">
          <View className="flex-row gap-3">
            <StatCard
              value={formatCurrency(totalWages)}
              label={t('wages.totalWages')}
              color="#10b981"
              icon="cash-multiple"
            />
            <StatCard
              value={totalDaysWorked.toFixed(1)}
              label={t('wages.daysWorked')}
              color="#3b82f6"
              icon="calendar-check"
            />
            <StatCard
              value={calculations.length}
              label={t('wages.employees')}
              icon="account-group"
            />
          </View>
        </CardContent>
      </Card>

      {calculations.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text variant="h4" className="text-center text-muted-foreground mb-2">
            {t('wages.noWageData')}
          </Text>
          <Text variant="muted" className="text-center">
            {t('wages.noWageDataHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={calculations}
          keyExtractor={(item) => item.employeeId}
          renderItem={renderWageCard}
          contentContainerClassName="px-4 pb-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
