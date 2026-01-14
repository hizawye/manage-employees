import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, I18nManager } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees } from '../../../src/hooks';
import { EmployeeStatus } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { formatCurrency, getWeekRange, getMonthRange } from '../../../src/utils/dateUtils';
import { calculateWagesForAllEmployees, getTotalWages } from '../../../src/services/WageCalculationService';
import { getAttendanceInRange } from '../../../src/database/repositories';
import { t } from '../../../src/i18n';

const isRTL = I18nManager.isRTL;

export default function ProfileScreen() {
  const { employees: allEmployees, loading: loadingAll } = useEmployees();
  const { employees: activeEmployees, loading: loadingActive } = useEmployees(EmployeeStatus.ACTIVE);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyWages, setWeeklyWages] = useState(0);
  const [monthlyWages, setMonthlyWages] = useState(0);
  const [attendanceStats, setAttendanceStats] = useState({
    weeklyPresent: 0,
    weeklyTotal: 0,
    monthlyPresent: 0,
    monthlyTotal: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const inactiveCount = useMemo(() => {
    return allEmployees.filter(e => e.status === EmployeeStatus.INACTIVE).length;
  }, [allEmployees]);

  const loadStats = useCallback(async () => {
    if (activeEmployees.length === 0) {
      setWeeklyWages(0);
      setMonthlyWages(0);
      setAttendanceStats({
        weeklyPresent: 0,
        weeklyTotal: 0,
        monthlyPresent: 0,
        monthlyTotal: 0,
      });
      setLoadingStats(false);
      return;
    }

    try {
      setLoadingStats(true);
      const weekRange = getWeekRange();
      const monthRange = getMonthRange();

      // Calculate wages
      const weeklyCalcs = await calculateWagesForAllEmployees(
        activeEmployees,
        weekRange.start,
        weekRange.end
      );
      const monthlyCalcs = await calculateWagesForAllEmployees(
        activeEmployees,
        monthRange.start,
        monthRange.end
      );

      setWeeklyWages(getTotalWages(weeklyCalcs));
      setMonthlyWages(getTotalWages(monthlyCalcs));

      // Calculate attendance
      const weeklyAttendance = await getAttendanceInRange(weekRange.start, weekRange.end);
      const monthlyAttendance = await getAttendanceInRange(monthRange.start, monthRange.end);

      const weeklyPresent = weeklyAttendance.filter(a => a.status === 'present').length;
      const weeklyHalf = weeklyAttendance.filter(a => a.status === 'half_day').length;
      const monthlyPresent = monthlyAttendance.filter(a => a.status === 'present').length;
      const monthlyHalf = monthlyAttendance.filter(a => a.status === 'half_day').length;

      setAttendanceStats({
        weeklyPresent: weeklyPresent + weeklyHalf * 0.5,
        weeklyTotal: weeklyAttendance.length,
        monthlyPresent: monthlyPresent + monthlyHalf * 0.5,
        monthlyTotal: monthlyAttendance.length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [activeEmployees]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const weeklyAttendanceRate = attendanceStats.weeklyTotal > 0
    ? Math.round((attendanceStats.weeklyPresent / attendanceStats.weeklyTotal) * 100)
    : 0;

  const monthlyAttendanceRate = attendanceStats.monthlyTotal > 0
    ? Math.round((attendanceStats.monthlyPresent / attendanceStats.monthlyTotal) * 100)
    : 0;

  if ((loadingAll || loadingActive || loadingStats) && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Employee Stats */}
      <Surface style={styles.section} elevation={2}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-group" size={26} color={colors.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('profile.employeeStats')}
          </Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text variant="headlineMedium" style={styles.statNumber}>
              {allEmployees.length}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              {t('profile.totalEmployees')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="headlineMedium" style={[styles.statNumber, { color: colors.success }]}>
              {activeEmployees.length}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              {t('profile.activeEmployees')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="headlineMedium" style={[styles.statNumber, { color: colors.error }]}>
              {inactiveCount}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              {t('profile.inactiveEmployees')}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Wage Stats */}
      <Surface style={styles.section} elevation={2}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="cash-multiple" size={26} color={colors.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('profile.wageStats')}
          </Text>
        </View>
        <View style={styles.wageRow}>
          <View style={styles.wageItem}>
            <Text variant="bodyMedium" style={styles.wageLabel}>
              {t('profile.thisWeek')}
            </Text>
            <Text variant="titleLarge" style={styles.wageValue}>
              {formatCurrency(weeklyWages)}
            </Text>
          </View>
          <View style={styles.wageDivider} />
          <View style={styles.wageItem}>
            <Text variant="bodyMedium" style={styles.wageLabel}>
              {t('profile.thisMonth')}
            </Text>
            <Text variant="titleLarge" style={styles.wageValue}>
              {formatCurrency(monthlyWages)}
            </Text>
          </View>
        </View>
      </Surface>

      {/* Attendance Stats */}
      <Surface style={styles.section} elevation={2}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="calendar-check" size={26} color={colors.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('profile.attendanceStats')}
          </Text>
        </View>
        <View style={styles.attendanceRow}>
          <View style={styles.attendanceItem}>
            <Text variant="bodyMedium" style={styles.attendanceLabel}>
              {t('profile.thisWeek')}
            </Text>
            <Text variant="headlineMedium" style={[styles.attendanceRate, { color: colors.present }]}>
              {weeklyAttendanceRate}%
            </Text>
            <Text variant="bodySmall" style={styles.attendanceDetail}>
              {attendanceStats.weeklyPresent} / {attendanceStats.weeklyTotal}
            </Text>
          </View>
          <View style={styles.attendanceItem}>
            <Text variant="bodyMedium" style={styles.attendanceLabel}>
              {t('profile.thisMonth')}
            </Text>
            <Text variant="headlineMedium" style={[styles.attendanceRate, { color: colors.present }]}>
              {monthlyAttendanceRate}%
            </Text>
            <Text variant="bodySmall" style={styles.attendanceDetail}>
              {attendanceStats.monthlyPresent} / {attendanceStats.monthlyTotal}
            </Text>
          </View>
        </View>
      </Surface>

      {/* App Info */}
      <Surface style={styles.section} elevation={2}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="information-outline" size={26} color={colors.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('profile.appInfo')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text variant="bodyLarge" style={styles.infoLabel}>
            {t('profile.language')}
          </Text>
          <Text variant="bodyLarge" style={styles.infoValue}>
            {t('profile.arabic')}
          </Text>
        </View>
        <View style={[styles.infoRow, styles.infoRowLast]}>
          <Text variant="bodyLarge" style={styles.infoLabel}>
            {t('profile.version')}
          </Text>
          <Text variant="bodyLarge" style={styles.infoValue}>
            1.0.0
          </Text>
        </View>
      </Surface>
    </ScrollView>
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
  },
  content: {
    padding: sizes.padding,
    paddingBottom: sizes.paddingLarge,
  },
  section: {
    padding: sizes.padding,
    borderRadius: sizes.borderRadius,
    backgroundColor: colors.surface,
    marginBottom: sizes.padding,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sizes.padding,
    gap: sizes.paddingSmall,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontWeight: '700',
    fontSize: 32,
    color: colors.text,
  },
  statLabel: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
  },
  wageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wageItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: sizes.paddingSmall,
  },
  wageDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  wageLabel: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontSize: 14,
  },
  wageValue: {
    fontWeight: '700',
    color: colors.success,
    fontSize: 20,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  attendanceLabel: {
    color: colors.textSecondary,
    marginBottom: 8,
    fontSize: 14,
  },
  attendanceRate: {
    fontWeight: '700',
    fontSize: 28,
  },
  attendanceDetail: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 13,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: sizes.padding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  infoValue: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.text,
  },
});
