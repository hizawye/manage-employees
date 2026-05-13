import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployee, useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components';
import { WageCalculation, WageType, Payment, AttendanceStatus } from '../../../src/models';
import {
  formatCurrency,
  formatDateShort,
  formatDate,
  getMonthRange,
  getTodayString,
} from '../../../src/utils/dateUtils';
import { calculateWagesForPeriod } from '../../../src/services/WageCalculationService';
import { PaymentService } from '../../../src/services/PaymentService';
import { t } from '../../../src/i18n';
import { Card, CardContent } from '../../../src/components/ui/card';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';
import { Badge } from '../../../src/components/ui/badge';

type DayData = {
  date: string;
  dayOfMonth: number;
  dayOfWeek: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  wageEarned: number;
  // for adjustments
  hasAdjustment?: boolean;
};

export default function EmployeeWageDetailScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { user } = useAuth();
  const { employee, loading: loadingEmployee } = useEmployee(employeeId);
  const [wageData, setWageData] = useState<WageCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [paidAmount, setPaidAmount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payDialogVisible, setPayDialogVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Adjustment modal state
  const [adjustDialogVisible, setAdjustDialogVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const [monthData, setMonthData] = useState<DayData[]>([]);

  const dateRange = useMemo(() => getMonthRange(), []);

  const loadWages = useCallback(async () => {
    if (!employee || !user) {
      setWageData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [result, paid, history] = await Promise.all([
        calculateWagesForPeriod(user.id, employee, dateRange.start, dateRange.end),
        PaymentService.getPaidAmount(user.id, employeeId, dateRange.start, dateRange.end),
        PaymentService.getEmployeePayments(user.id, employeeId, dateRange.start, dateRange.end),
      ]);
      setWageData(result);
      setPaidAmount(paid);
      setPayments(history);

      // Build day data for the full month
      const days: DayData[] = [];
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const detailMap = new Map<string, typeof result.details[0]>();
      for (const d of result.details) {
        detailMap.set(d.date, d);
      }

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const rec = detailMap.get(dateStr);
        const dow = d.toLocaleDateString('en-US', { weekday: 'short' });
        if (rec) {
          days.push({
            date: dateStr,
            dayOfMonth: d.getDate(),
            dayOfWeek: dow,
            status: rec.status,
            hoursWorked: rec.hoursWorked,
            wageEarned: rec.wageEarned + (rec.adjustment || 0),
            hasAdjustment: !!rec.adjustment,
          });
        } else {
          days.push({
            date: dateStr,
            dayOfMonth: d.getDate(),
            dayOfWeek: dow,
            status: AttendanceStatus.ABSENT,
            wageEarned: 0,
          });
        }
      }
      setMonthData(days);
    } catch (error) {
      console.error('Failed to calculate wages:', error);
    } finally {
      setLoading(false);
    }
  }, [employee, user, dateRange, employeeId]);

  useEffect(() => {
    loadWages();
  }, [loadWages]);

  const { refreshing, onRefresh } = useRefresh(loadWages);

  const remainingAmount = useMemo(() => {
    if (!wageData) return 0;
    return wageData.totalWage - paidAmount;
  }, [wageData, paidAmount]);

  const isFullyPaid = remainingAmount <= 0;

  const handlePay = async () => {
    if (!user || !wageData) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount === 0) return;

    try {
      setPayLoading(true);
      await PaymentService.recordPayment(user.id, {
        userId: user.id,
        employeeId,
        amount,
        periodStart: dateRange.start,
        periodEnd: dateRange.end,
        paymentDate: getTodayString(),
        notes: payNotes || undefined,
      });
      setPayDialogVisible(false);
      setPayAmount('');
      setPayNotes('');
      await loadWages();
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setPayLoading(false);
    }
  };

  const paymentValidationError = useMemo(() => {
    const amount = parseFloat(payAmount);
    if (payAmount && !isNaN(amount) && amount > 0 && amount > remainingAmount) {
      return t('wages.overpaymentError') || 'Amount exceeds remaining balance';
    }
    return null;
  }, [payAmount, remainingAmount]);

  const handleDeletePayment = async (paymentId: string) => {
    if (!user) return;
    try {
      await PaymentService.deletePayment(user.id, paymentId);
      await loadWages();
    } catch (error) {
      console.error('Failed to delete payment:', error);
    }
  };

  const handleAdjustDay = async () => {
    if (!user || !selectedDate) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;

    try {
      setPayLoading(true);
      // For now, we update state optimistically
      // In a full implementation, this would be a server API call
      setMonthData((prev) =>
        prev.map((day) =>
          day.date === selectedDate
            ? {
                ...day,
                wageEarned: day.wageEarned + amount,
                hasAdjustment: true,
              }
            : day
        )
      );
      setAdjustDialogVisible(false);
      setAdjustAmount('');
      setAdjustNote('');
    } catch (error) {
      console.error('Failed to adjust:', error);
    } finally {
      setPayLoading(false);
    }
  };

  const openAdjustDialog = (date: string) => {
    setSelectedDate(date);
    setAdjustAmount('');
    setAdjustNote('');
    setAdjustDialogVisible(true);
  };

  const openPayDialog = () => {
    setPayDialogVisible(true);
  };

  const workedDays = useMemo(() => {
    return monthData.filter(
      (d) => d.status !== AttendanceStatus.ABSENT || d.hasAdjustment
    );
  }, [monthData]);

  if ((loadingEmployee || loading) && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  if (!employee || !wageData) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-destructive text-center">{t('employee.employeeNotFound')}</Text>
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
        {/* Employee Header */}
        <View className="px-4 py-4 bg-card border-b border-border">
          <Text variant="h3" className="font-bold text-foreground">
            {employee.name}
          </Text>
          <Text variant="muted" className="mt-1">
            {employee.role} · {employee.wageType === WageType.DAILY ? t('attendance.daily') : t('attendance.hourly')}: {formatCurrency(employee.wageRate)}
          </Text>
        </View>

        {/* Monthly Summary */}
        <Card className="mx-4 mt-4 mb-2">
          <CardContent className="p-4">
            <View className="items-center mb-4">
              <Text variant="muted">{t('wages.totalWage')}</Text>
              <Text variant="h2" className="font-bold text-emerald-500 mt-1">
                {formatCurrency(wageData.totalWage)}
              </Text>
            </View>

            {paidAmount > 0 && (
              <>
                <View className="flex-row justify-between items-center mb-1">
                  <Text variant="p" className="text-muted-foreground">
                    {t('wages.paid')}:
                  </Text>
                  <Text variant="p" className="font-semibold text-emerald-500">
                    {formatCurrency(paidAmount)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text variant="p" className="text-muted-foreground">
                    {t('wages.remaining')}:
                  </Text>
                  <Text variant="p" className={`font-semibold ${isFullyPaid ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(remainingAmount)}
                  </Text>
                </View>
                <View className="border-t border-border pt-2" />
              </>
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

            {!isFullyPaid && wageData.totalWage > 0 && (
              <Button onPress={openPayDialog} className="mt-4">
                {t('wages.markAsPaid')}
              </Button>
            )}

            {isFullyPaid && (
              <View className="mt-4 items-center py-2 bg-emerald-500/15 rounded-lg">
                <Text className="text-emerald-500 font-bold">{t('wages.fullyPaid')}</Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Payments History */}
        {payments.length > 0 && (
          <Card className="mx-4 mb-2">
            <CardContent className="p-4">
              <Text variant="large" className="font-semibold text-foreground mb-3">
                {t('wages.paymentHistory')}
              </Text>
              {payments.map((p) => (
                <View key={p.id} className="flex-row justify-between items-center py-1">
                  <Text variant="muted" className="text-sm">
                    {formatDate(p.paymentDate)}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text variant="p" className="font-semibold text-emerald-500">
                      {formatCurrency(p.amount)}
                    </Text>
                    <Pressable onPress={() => handleDeletePayment(p.id)} className="p-1">
                      <MaterialCommunityIcons name="delete-outline" size={18} className="text-destructive" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Daily Breakdown - Stacked list of worked days */}
        <Text variant="large" className="font-semibold text-muted-foreground px-4 mb-2">
          {t('wages.dailyBreakdown')}
        </Text>

        <Card className="mx-4 mb-2">
          <CardContent className="p-0">
            {workedDays.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-muted-foreground text-sm">
                  {t('wages.noAttendanceRecords')}
                </Text>
              </View>
            ) : (
              workedDays.map((day) => {
                const isWeekend = ['Sat', 'Sun'].includes(day.dayOfWeek);
                return (
                  <Pressable
                    key={day.date}
                    onPress={() => {
                      if (day.status === AttendanceStatus.ABSENT && !day.hasAdjustment) {
                        openAdjustDialog(day.date);
                      }
                    }}
                    className={`flex-row justify-between items-center px-4 py-2.5 ${
                      isWeekend ? 'bg-muted/15' : 'bg-card'
                    } border-b border-border`}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {formatDateShort(day.date)}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Badge
                          variant={
                            day.status === AttendanceStatus.PRESENT
                              ? 'success'
                              : day.status === AttendanceStatus.HALF_DAY
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          <Text className="text-[8px] leading-[8px]">
                            {day.status === AttendanceStatus.PRESENT
                              ? 'P'
                              : day.status === AttendanceStatus.HALF_DAY
                              ? 'H'
                              : 'A'}
                          </Text>
                        </Badge>
                        {day.status === AttendanceStatus.HALF_DAY && (
                          <Text className="text-[10px] text-muted-foreground">
                            {t('attendance.halfDay')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-foreground">
                        {formatCurrency(day.wageEarned)}
                      </Text>
                      {day.hasAdjustment && (
                        <Text className="text-[10px] text-emerald-500 font-medium">
                          adj
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Payment Dialog */}
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
            <Text variant="p" className="text-muted-foreground mb-4">
              {t('wages.remaining')}: {formatCurrency(remainingAmount)}
            </Text>
            <TextInput
              placeholder={t('wages.paymentAmount')}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="hsl(215 16% 47%)"
              className={`w-full rounded-lg border bg-background px-3 py-2.5 text-base text-foreground mb-1 ${
                paymentValidationError ? 'border-destructive' : 'border-border'
              }`}
            />
            {paymentValidationError && (
              <Text className="text-sm text-destructive mb-2">{paymentValidationError}</Text>
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
                disabled={payLoading || !!paymentValidationError || !payAmount || parseFloat(payAmount) === 0}
              >
                {t('wages.confirmPayment')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Day Adjustment Dialog */}
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
              {t('wages.adjustmentNote')}
            </Text>
            <TextInput
              placeholder="0.00"
              value={adjustAmount}
              onChangeText={setAdjustAmount}
              keyboardType="decimal-pad"
              placeholderTextColor="hsl(215 16% 47%)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base text-foreground mb-2"
            />
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
              <Button className="flex-1" onPress={handleAdjustDay} isLoading={payLoading}>
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}