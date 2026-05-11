import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  Button,
  useTheme,
  Divider,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useEmployee, useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components';
import { WageCalculation, WageDetail, WageType, Payment } from '../../../src/models';
import { sizes, colors as staticColors } from '../../../src/constants/theme';
import {
  formatCurrency,
  formatDateShort,
  formatDate,
  getWeekRange,
  getMonthRange,
  getTodayString,
} from '../../../src/utils/dateUtils';
import { calculateWagesForPeriod } from '../../../src/services/WageCalculationService';
import { PaymentService } from '../../../src/services/PaymentService';
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
  const [paidAmount, setPaidAmount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payDialogVisible, setPayDialogVisible] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

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
      const [result, paid, history] = await Promise.all([
        calculateWagesForPeriod(user.id, employee, dateRange.start, dateRange.end),
        PaymentService.getPaidAmount(user.id, employeeId, dateRange.start, dateRange.end),
        PaymentService.getEmployeePayments(user.id, employeeId, dateRange.start, dateRange.end),
      ]);
      setWageData(result);
      setPaidAmount(paid);
      setPayments(history);
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
    return Math.max(0, wageData.totalWage - paidAmount);
  }, [wageData, paidAmount]);

  const isFullyPaid = remainingAmount <= 0;

  const handlePay = async () => {
    if (!user || !wageData) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > remainingAmount) return;

    setPayLoading(true);
    try {
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
    if (payAmount && !isNaN(amount) && amount > remainingAmount) {
      return t('wages.overpaymentError') || 'Amount exceeds remaining balance';
    }
    return null;
  }, [payAmount, remainingAmount]);

  const openPayDialog = () => {
    setPayAmount(remainingAmount.toFixed(2));
    setPayDialogVisible(true);
  };

  const renderPaymentItem = useCallback(({ item }: { item: Payment }) => (
    <View style={styles.paymentRow}>
      <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
        {formatDate(item.paymentDate)}
      </Text>
      <Text variant="bodyMedium" style={{ fontWeight: '600', color: staticColors.success }}>
        {formatCurrency(item.amount)}
      </Text>
    </View>
  ), [colors]);

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
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

          {paidAmount > 0 && (
            <>
              <View style={styles.paymentStatusRow}>
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                  {t('wages.paid')}:
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: staticColors.success }}>
                  {formatCurrency(paidAmount)}
                </Text>
              </View>
              <View style={styles.paymentStatusRow}>
                <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
                  {t('wages.remaining')}:
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: isFullyPaid ? staticColors.success : colors.error }}>
                  {formatCurrency(remainingAmount)}
                </Text>
              </View>
              <Divider style={{ marginVertical: sizes.paddingSmall }} />
            </>
          )}

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

          {!isFullyPaid && wageData.totalWage > 0 && (
            <Button
              mode="contained"
              onPress={openPayDialog}
              style={{ marginTop: sizes.padding }}
              icon="cash-check"
            >
              {t('wages.markAsPaid')}
            </Button>
          )}

          {isFullyPaid && (
            <View style={styles.paidBadge}>
              <Text variant="bodyMedium" style={{ color: staticColors.success, fontWeight: 'bold' }}>
                {t('wages.fullyPaid')}
              </Text>
            </View>
          )}
        </Surface>

        {payments.length > 0 && (
          <Surface style={[styles.paymentsCard, { backgroundColor: colors.surface }]} elevation={1}>
            <Text variant="titleSmall" style={{ marginBottom: sizes.paddingSmall }}>
              {t('wages.paymentHistory')}
            </Text>
            {payments.map((p) => (
              <View key={p.id} style={styles.paymentRow}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {formatDate(p.paymentDate)}
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: staticColors.success }}>
                  {formatCurrency(p.amount)}
                </Text>
              </View>
            ))}
          </Surface>
        )}

        <Text variant="titleSmall" style={[styles.breakdownTitle, { color: colors.onSurfaceVariant }]}>
          {t('wages.dailyBreakdown')}
        </Text>

        {wageData.details.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>{t('wages.noAttendanceRecords')}</Text>
          </View>
        ) : (
          wageData.details.map((item) => (
            <Card key={item.date} style={[styles.detailCard, { backgroundColor: colors.surface }]}>
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
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={payDialogVisible} onDismiss={() => setPayDialogVisible(false)}>
          <Dialog.Title>{t('wages.recordPayment')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: sizes.padding }}>
              {t('wages.totalWage')}: {formatCurrency(wageData.totalWage)}
            </Text>
            <Text variant="bodyMedium" style={{ marginBottom: sizes.padding }}>
              {t('wages.remaining')}: {formatCurrency(remainingAmount)}
            </Text>
            <TextInput
              mode="outlined"
              label={t('wages.paymentAmount')}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              style={{ marginBottom: sizes.paddingSmall }}
              error={!!paymentValidationError}
            />
            {paymentValidationError && (
              <Text variant="bodySmall" style={{ color: colors.error, marginBottom: sizes.paddingSmall }}>
                {paymentValidationError}
              </Text>
            )}
            <TextInput
              mode="outlined"
              label={t('wages.notesOptional')}
              value={payNotes}
              onChangeText={setPayNotes}
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPayDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button
              onPress={handlePay}
              loading={payLoading}
              disabled={payLoading || !!paymentValidationError || !payAmount || parseFloat(payAmount) <= 0}
            >
              {t('wages.confirmPayment')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: sizes.paddingLarge,
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
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  paidBadge: {
    marginTop: sizes.padding,
    alignItems: 'center',
    padding: sizes.paddingSmall,
    backgroundColor: staticColors.success + '15',
    borderRadius: sizes.borderRadius,
  },
  paymentsCard: {
    margin: sizes.padding,
    marginTop: 0,
    padding: sizes.padding,
    borderRadius: sizes.borderRadius,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownTitle: {
    paddingHorizontal: sizes.padding,
    marginBottom: sizes.paddingSmall,
  },
  detailCard: {
    marginHorizontal: sizes.padding,
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
    padding: sizes.padding,
    alignItems: 'center',
  },
  emptyText: {
  },
  error: {
  },
});
