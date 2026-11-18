import { useState, useMemo, useCallback, useRef } from 'react';
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useRefresh } from '../../../src/hooks';
import { StatCard } from '../../../src/components/cards/StatCard';
import { EmployeeStatus, WageCalculation } from '../../../src/models';
import {
  formatCurrency,
  formatDate,
  getMonthRange,
} from '../../../src/utils/dateUtils';
import { calculateWagesForAllEmployees, getTotalWages } from '../../../src/services/WageCalculationService';
import { EmployeeService } from '../../../src/services/EmployeeService';
import { Button } from '../../../src/components/ui/button';
import { PaymentService } from '../../../src/services/PaymentService';
import { t } from '../../../src/i18n';
import { useAuth } from '../../../src/auth/useAuth';
import { Text } from '../../../src/components/ui/text';

interface WageWithPayment extends WageCalculation {
   paidAmount: number;
   remaining: number;
   isFullyPaid: boolean;
   isOverpaid: boolean;
}

export default function WageSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [calculations, setCalculations] = useState<WageWithPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dateRange, setDateRange] = useState(getMonthRange);
  const loadVersion = useRef(0);

  const loadWages = useCallback(async () => {
    const version = ++loadVersion.current;
    setError(false);
    setLoading(true);
    try {
      if (!user) {
        setCalculations([]);
        return;
      }
      const period = getMonthRange();
      const employees = await EmployeeService.getAllEmployees(user.id, undefined, true);
      const results = await calculateWagesForAllEmployees(user.id, employees, period.start, period.end);
      const withPayments = await Promise.all(results.map(async (calc, index) => {
        const balance = await PaymentService.isFullyPaid(
          user.id, calc.employeeId, period.start, period.end, calc.totalWage
        );
        if (employees[index].status === EmployeeStatus.INACTIVE && balance.paid === 0 &&
            !calc.details.some((day) => day.hasAttendance || day.adjustment !== undefined)) return null;
        return {
          ...calc,
          paidAmount: balance.paid,
          remaining: balance.remaining,
          isFullyPaid: balance.isFullyPaid,
          isOverpaid: balance.isOverpaid,
        };
      }));
      if (loadVersion.current === version) {
        setDateRange(period);
        setCalculations(withPayments.filter((item): item is WageWithPayment => item !== null));
      }
    } catch (cause) {
      console.error('Failed to calculate wages:', cause);
      if (loadVersion.current === version) {
        setCalculations([]);
        setError(true);
      }
    } finally {
      if (loadVersion.current === version) setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void loadWages();
    return () => { loadVersion.current++; };
  }, [loadWages]));

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

  const renderWageCard = useCallback(({ item }: { item: WageWithPayment }) => {
    const handlePress = () => {
      router.push({ pathname: '/wages/[employeeId]', params: { employeeId: item.employeeId } });
    };

    return (
      <Pressable onPress={handlePress}>
        <View className="mb-3 rounded-xl border border-border bg-card overflow-hidden">
          <View className="p-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text variant="large" className="font-semibold text-foreground">
                  {item.employeeName}
                </Text>
                <Text variant="muted" className="mt-0.5">
                  {item.totalDaysPresent} {t('wages.daysPresent')} · {item.totalHalfDays} {t('wages.halfDays')}
                </Text>
                {item.paidAmount > 0 && (
                  <Text variant="muted" className="mt-0.5">
                    {t('wages.paid')}: {formatCurrency(item.paidAmount)}
                  </Text>
                )}
              </View>
              <View className="items-end">
                <Text variant="h3" className="font-bold text-emerald-500">
                  {formatCurrency(item.totalWage)}
                </Text>
                {(item.totalWage > 0 || item.paidAmount > 0) && (
                  <Text className={`mt-1 text-xs font-semibold ${item.isOverpaid ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {item.isOverpaid
                      ? `${t('wages.overpaid')}: ${formatCurrency(-item.remaining)}`
                      : item.isFullyPaid ? t('wages.fullyPaid') : `${t('wages.remaining')}: ${formatCurrency(item.remaining)}`}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [router]);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 py-4 bg-card border-b border-border">
        <Text variant="h3" className="font-bold text-foreground text-center">
          {t('wages.title')}
        </Text>
        <Text variant="muted" className="text-center mt-1">
          {t('wages.thisMonth')}: {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
        </Text>
      </View>

      <View className="mx-4 mt-3">
        <View className="flex-row gap-3">
          <StatCard value={formatCurrency(totalWages)} label={t('wages.totalWages')} color="#10b981" icon="cash-multiple" />
          <StatCard value={totalDaysWorked.toFixed(1)} label={t('wages.daysWorked')} icon="calendar-check" />
          <StatCard value={calculations.length} label={t('wages.employees')} icon="account-group" />
        </View>
      </View>

      {calculations.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text variant="h4" className="text-center text-muted-foreground mb-2">
            {error ? t('common.error') : t('wages.noWageData')}
          </Text>
          {error ? (
            <Button variant="outline" onPress={onRefresh}>{t('common.retry')}</Button>
          ) : (
            <Text variant="muted" className="text-center">{t('wages.noWageDataHint')}</Text>
          )}
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
