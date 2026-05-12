import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees, useRefresh } from '../../../src/hooks';
import { StatCard } from '../../../src/components';
import { EmployeeStatus, WageCalculation } from '../../../src/models';
import {
  formatCurrency,
  formatDate,
  getMonthRange,
} from '../../../src/utils/dateUtils';
import { calculateWagesForAllEmployees, getTotalWages } from '../../../src/services/WageCalculationService';
import { PaymentService } from '../../../src/services/PaymentService';
import { t } from '../../../src/i18n';
import { useAuth } from '../../../src/auth/useAuth';
import { Card, CardContent } from '../../../src/components/ui/card';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';
import { Badge } from '../../../src/components/ui/badge';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WageWithPayment extends WageCalculation {
  paidAmount: number;
  remaining: number;
  isFullyPaid: boolean;
}

export default function WageSummaryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { employees, loading: loadingEmployees, refresh: refreshEmployees } = useEmployees(EmployeeStatus.ACTIVE);
  const [calculations, setCalculations] = useState<WageWithPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => getMonthRange(), []);

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
          const remaining = calc.totalWage - paid;
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

  const renderWageCard = useCallback(({ item }: { item: WageWithPayment }) => {
    const handlePress = () => {
      router.push({ pathname: '/wages/[employeeId]', params: { employeeId: item.employeeId } });
    };

    return (
      <Pressable onPress={handlePress}>
        <Card className="mb-3">
          <CardContent className="p-4">
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
                    {t('wages.paid')}: {formatCurrency(item.paidAmount)} · {t('wages.remaining')}: {formatCurrency(item.remaining)}
                  </Text>
                )}
              </View>
              <View className="items-end">
                <Text variant="h3" className="font-bold text-emerald-500">
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
    );
  }, [router]);

  if ((loadingEmployees || loading) && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-4 bg-card border-b border-border">
        <Text variant="h3" className="font-bold text-foreground text-center">
          {t('wages.title')}
        </Text>
        <Text variant="muted" className="text-center mt-1">
          {t('wages.thisMonth')}: {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
        </Text>
      </View>

      {/* Summary */}
      <Card className="mx-4 mt-3">
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

// Local import needed for Pressable
import { Pressable } from 'react-native';