import { useState, useMemo, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, Modal, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { Employee, WageCalculation, WageDetail, WageType, Payment } from '../../../src/models';
import {
  formatCurrency,
  formatDateShort,
  formatDate,
  getMonthRange,
  getTodayString,
} from '../../../src/utils/dateUtils';
import { calculateWagesForPeriod } from '../../../src/services/WageCalculationService';
import { EmployeeService } from '../../../src/services/EmployeeService';
import { getStatusLabel } from '../../../src/utils/attendanceUtils';
import { isCurrencyAmount, toCentimes } from '../../../src/utils/money';
import { parseLocalizedDecimal } from '../../../src/utils/numberUtils';
import { getPaymentHistoryBalance, PaymentService } from '../../../src/services/PaymentService';
import { WageAdjustmentService } from '../../../src/services/WageAdjustmentService';
import { t } from '../../../src/i18n';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';

export default function EmployeeWageDetailScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [wageData, setWageData] = useState<WageCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);
  const saving = useRef(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payDialogVisible, setPayDialogVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const [adjustDialogVisible, setAdjustDialogVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const loadWages = useCallback(async () => {
    const version = ++loadVersion.current;
    setError('');
    setLoading(true);
    try {
      const currentEmployee = user && employeeId
        ? await EmployeeService.getEmployeeById(user.id, employeeId, true)
        : null;
      if (!user || !currentEmployee) {
        if (version === loadVersion.current) {
          setWageData(null);
          setEmployee(null);
          setPayments([]);
        }
        return;
      }
      const { start, end } = getMonthRange();
      const [result, history] = await Promise.all([
        calculateWagesForPeriod(user.id, currentEmployee, start, end),
        PaymentService.getEmployeePayments(user.id, employeeId, start, end),
      ]);
      if (version === loadVersion.current) {
        setEmployee(currentEmployee);
        setWageData(result);
        setPayments(history);
      }
    } catch (cause) {
      console.error('Failed to calculate wages:', cause);
      if (version === loadVersion.current) {
        setWageData(null);
        setError(t('common.error'));
      }
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [user, employeeId]);

  useFocusEffect(useCallback(() => {
    void loadWages();
    return () => { loadVersion.current++; };
  }, [loadWages]));

  const { refreshing, onRefresh } = useRefresh(loadWages);
  const { paid: paidAmount, remaining: remainingAmount, isOverpaid, isFullyPaid,
    overpaidAmount: excessAmount, overpaidPaymentIds } = useMemo(
    () => getPaymentHistoryBalance(wageData?.totalWage ?? 0, payments),
    [wageData, payments]
  );
  const payment = parseLocalizedDecimal(payAmount);
  const adjustment = parseLocalizedDecimal(adjustAmount);
  const paymentValid = isCurrencyAmount(payment) && payment > 0;
  const adjustmentValid = isCurrencyAmount(adjustment);
  const projectedExcess = paymentValid
    ? Math.max(0, toCentimes(payment) - toCentimes(remainingAmount)) / 100 : 0;

  const handlePay = async () => {
    if (!user || !wageData || !paymentValid || saving.current) return;
    saving.current = true;
    try {
      setPayLoading(true);
      await PaymentService.recordPayment(user.id, {
        userId: user.id,
        employeeId: wageData.employeeId,
        amount: payment,
        periodStart: wageData.period.start,
        periodEnd: wageData.period.end,
        paymentDate: getTodayString(),
        notes: payNotes || undefined,
      });
      setPayDialogVisible(false);
      setPayAmount('');
      setPayNotes('');
      await loadWages();
    } catch (error) {
      console.error('Failed to record payment:', error);
      Alert.alert(t('common.error'));
    } finally {
      saving.current = false;
      setPayLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!user) return;
    Alert.alert(t('wages.deletePaymentTitle'), t('wages.deletePaymentMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingPaymentId(paymentId);
            await PaymentService.deletePayment(user.id, paymentId);
            await loadWages();
          } catch (error) {
            console.error('Failed to delete payment:', error);
            Alert.alert(t('common.error'));
          } finally {
            setDeletingPaymentId(null);
          }
        },
      },
    ]);
  };

  const handleAdjustDay = async () => {
    if (!user || !wageData || !selectedDate || !adjustmentValid || saving.current) return;
    saving.current = true;
    try {
      setPayLoading(true);
      await WageAdjustmentService.saveAdjustment(user.id, {
        userId: user.id,
        employeeId: wageData.employeeId,
        date: selectedDate,
        amount: adjustment,
        note: adjustNote || undefined,
      });
      setAdjustDialogVisible(false);
      setAdjustAmount('');
      setAdjustNote('');
      await loadWages();
    } catch (error) {
      console.error('Failed to adjust:', error);
      Alert.alert(t('common.error'));
    } finally {
      saving.current = false;
      setPayLoading(false);
    }
  };

  const openAdjustDialog = (day: WageDetail) => {
    setSelectedDate(day.date);
    setAdjustAmount(day.adjustment?.toString() ?? '');
    setAdjustNote(day.adjustmentNote ?? '');
    setAdjustDialogVisible(true);
  };

  const openPayDialog = () => {
    setPayAmount(remainingAmount > 0 ? remainingAmount.toFixed(2) : '');
    setPayNotes('');
    setPayDialogVisible(true);
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!employee || !wageData) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-destructive text-center">{error || t('employee.employeeNotFound')}</Text>
        <Button variant="outline" onPress={onRefresh}>{t('common.retry')}</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 py-4 bg-card border-b border-border">
          <Text variant="h3" className="font-bold text-foreground">
            {employee.name}
          </Text>
          <Text variant="muted" className="mt-1">
            {employee.role} · {employee.wageType === WageType.DAILY ? t('attendance.daily') : t('attendance.hourly')}: {formatCurrency(employee.wageRate)}
          </Text>
        </View>

        <View className="mx-4 mt-4 mb-2 rounded-xl border border-border bg-card overflow-hidden">
          <View className="p-4">
            <View className="items-center mb-4">
              <Text variant="muted">{t('wages.totalWage')}</Text>
              <Text variant="h2" className="font-bold text-emerald-500 mt-1">
                {formatCurrency(wageData.totalWage)}
              </Text>
            </View>

            {paidAmount > 0 && (
              <View className="border-b border-border pb-2">
                <View className="flex-row justify-between items-center mb-1">
                  <Text variant="muted">{t('wages.paid')}</Text>
                  <Text className="font-semibold text-emerald-500">{formatCurrency(paidAmount)}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text variant="muted">{isOverpaid ? t('wages.overpaid') : t('wages.remaining')}</Text>
                  <Text className="font-semibold text-foreground">
                    {formatCurrency(isOverpaid ? excessAmount : remainingAmount)}
                  </Text>
                </View>
              </View>
            )}

            <View className="flex-row justify-around pt-2">
              <View className="items-center">
                <Text variant="h3" className="font-bold text-emerald-500">
                  {wageData.totalDaysPresent}
                </Text>
                <Text variant="muted" className="text-xs mt-1">
                  {t('wages.daysPresent')}
                </Text>
              </View>
              <View className="items-center">
                <Text variant="h3" className="font-bold text-amber-500">
                  {wageData.totalHalfDays}
                </Text>
                <Text variant="muted" className="text-xs mt-1">
                  {t('wages.halfDays')}
                </Text>
              </View>
              <View className="items-center">
                <Text variant="h3" className="font-bold text-red-500">
                  {wageData.totalDaysAbsent}
                </Text>
                <Text variant="muted" className="text-xs mt-1">
                  {t('wages.daysAbsent')}
                </Text>
              </View>
              {employee.wageType === WageType.HOURLY && (
                <View className="items-center">
                  <Text variant="h3" className="font-bold text-foreground">
                    {wageData.totalHoursWorked?.toFixed(1) || 0}
                  </Text>
                  <Text variant="muted" className="text-xs mt-1">
                    {t('wages.hours')}
                  </Text>
                </View>
              )}
            </View>

            {wageData.totalWage > 0 && (
              <Button
                onPress={openPayDialog}
                className="mt-4"
                variant={isFullyPaid ? 'warning' : 'default'}
              >
                {isFullyPaid ? t('wages.addAdditionalPayment') : t('wages.markAsPaid')}
              </Button>
            )}
            {isFullyPaid && !isOverpaid && (
              <Text className="mt-4 text-center text-emerald-500 font-bold">{t('wages.fullyPaid')}</Text>
            )}
          </View>
        </View>

        {payments.length > 0 && (
          <View className="mx-4 mb-2 rounded-xl border border-border bg-card overflow-hidden">
            <View className="p-4">
              <Text variant="large" className="font-semibold text-foreground mb-3">
                {t('wages.paymentHistory')}
              </Text>
              {payments.map((payment) => (
                <View key={payment.id} className="flex-row justify-between items-center py-1">
                  <Text variant="muted">{formatDate(payment.paymentDate)}</Text>
                  <View className="flex-row items-center gap-2">
                    {overpaidPaymentIds.has(payment.id) && (
                      <Text className="text-xs text-amber-500">{t('wages.overpaid')}</Text>
                    )}
                    <Text className="font-semibold text-foreground">{formatCurrency(payment.amount)}</Text>
                    <Pressable
                      onPress={() => handleDeletePayment(payment.id)}
                      className="p-2"
                      accessibilityRole="button"
                      accessibilityLabel={t('wages.deletePaymentTitle')}
                      disabled={deletingPaymentId === payment.id}
                    >
                      {deletingPaymentId === payment.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <MaterialCommunityIcons name="delete-outline" size={18} className="text-destructive" />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text variant="large" className="font-semibold text-muted-foreground px-4 mb-2">
          {t('wages.dailyBreakdown')}
        </Text>

        <Text variant="muted" className="px-4 mb-2">{t('wages.adjustmentHint')}</Text>
        <View className="mx-4 mb-2 rounded-xl border border-border bg-card overflow-hidden">
          {wageData.details.map((day) => (
            <Pressable
              key={day.date}
              onPress={() => openAdjustDialog(day)}
              accessibilityRole="button"
              accessibilityLabel={`${t('wages.adjustWage')} · ${formatDate(day.date)}`}
              className="flex-row justify-between items-center px-4 py-2.5 border-b border-border"
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{formatDateShort(day.date)}</Text>
                <Text variant="muted">{day.hasAttendance ? getStatusLabel(day.status) : t('wages.unmarked')}</Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-foreground">{formatCurrency(day.wageEarned)}</Text>
                {day.adjustment !== undefined && (
                  <Text variant="muted">{t('wages.adjustment')} · {formatCurrency(day.adjustment)}</Text>
                )}
              </View>
              <MaterialCommunityIcons name="pencil-outline" size={16} className="ms-2 text-muted-foreground" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={payDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPayDialogVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="w-full bg-card rounded-xl p-5 border border-border">
            <Text variant="h3" className="font-bold text-foreground mb-4">
              {t('wages.recordPayment')}
            </Text>
            <Text variant="p" className="text-muted-foreground mb-1">
              {t('wages.totalWage')}: {formatCurrency(wageData.totalWage)}
            </Text>
            <Text variant="muted" className="mb-4">
              {isOverpaid
                ? `${t('wages.overpaid')}: ${formatCurrency(excessAmount)}`
                : `${t('wages.remaining')}: ${formatCurrency(remainingAmount)}`}
            </Text>
            <TextInput
              placeholder={t('wages.paymentAmount')}
              accessibilityLabel={t('wages.paymentAmount')}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="hsl(215 16% 47%)"
              className={`w-full rounded-lg border bg-background px-3 py-2.5 text-base text-foreground mb-1 ${projectedExcess > 0 ? 'border-amber-500' : 'border-border'}`}
            />
            {projectedExcess > 0 && (
              <Text className="text-xs text-amber-500 mb-2">
                {t('wages.overpaymentWarning', { excess: formatCurrency(projectedExcess) })}
              </Text>
            )}
            {payAmount.length > 0 && !paymentValid && (
              <Text className="text-xs text-destructive mb-2">
                {isCurrencyAmount(payment) && payment <= 0 ? t('validation.invalidNumber') : t('wages.invalidAmount')}
              </Text>
            )}
            <TextInput
              placeholder={t('wages.notesOptional')}
              value={payNotes}
              onChangeText={setPayNotes}
              multiline
              numberOfLines={2}
              placeholderTextColor="hsl(215 16% 47%)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground mb-4"
            />
            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={() => setPayDialogVisible(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                onPress={handlePay}
                isLoading={payLoading}
                disabled={!paymentValid}
                variant={projectedExcess > 0 ? 'warning' : 'default'}
              >
                {projectedExcess > 0 ? t('wages.confirmOverpayment') : t('wages.confirmPayment')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={adjustDialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAdjustDialogVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="w-full bg-card rounded-xl p-5 border border-border">
            <Text variant="h3" className="font-bold text-foreground mb-4">
              {t('wages.adjustWage')}
            </Text>
            <Text variant="p" className="text-muted-foreground mb-4">
              {formatDate(selectedDate || wageData.period.start)}
            </Text>
            <TextInput
              placeholder={t('wages.adjustmentAmount')}
              accessibilityLabel={t('wages.adjustmentAmount')}
              value={adjustAmount}
              onChangeText={setAdjustAmount}
              keyboardType="numeric"
              placeholderTextColor="hsl(215 16% 47%)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground mb-2"
            />
            {adjustAmount.length > 0 && !adjustmentValid && (
              <Text className="text-xs text-destructive mb-2">{t('wages.invalidAmount')}</Text>
            )}
            <TextInput
              placeholder={t('wages.adjustmentNote')}
              value={adjustNote}
              onChangeText={setAdjustNote}
              multiline
              numberOfLines={2}
              placeholderTextColor="hsl(215 16% 47%)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground mb-4"
            />
            <View className="flex-row gap-3">
              <Button variant="outline" className="flex-1" onPress={() => setAdjustDialogVisible(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onPress={handleAdjustDay} isLoading={payLoading} disabled={!adjustmentValid}>
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
