import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEmployees, useAttendanceStats } from '../../../src/hooks';
import { StatCard } from '../../../src/components';
import { EmployeeStatus } from '../../../src/models';
import { formatCurrency, getWeekRange, getMonthRange } from '../../../src/utils/dateUtils';
import { calculateWagesForAllEmployees, getTotalWages } from '../../../src/services/WageCalculationService';
import { t, getLocale, setLocale } from '../../../src/i18n';
import { useAuth } from '../../../src/auth/useAuth';
import { useThemeContext } from '../../../src/theme';
import { Card, CardContent } from '../../../src/components/ui/card';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isGuest } = useAuth();
  const { themeMode, setThemeMode } = useThemeContext();
  const { employees: allEmployees, loading: loadingAll } = useEmployees();
  const { employees: activeEmployees, loading: loadingActive } = useEmployees(EmployeeStatus.ACTIVE);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyWages, setWeeklyWages] = useState(0);
  const [monthlyWages, setMonthlyWages] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentLocale, setCurrentLocale] = useState(getLocale());

  const weekRange = useMemo(() => getWeekRange(), []);
  const monthRange = useMemo(() => getMonthRange(), []);
  const { stats: attendanceStats, loading: loadingAttendanceStats, refresh: refreshAttendanceStats } = useAttendanceStats(
    weekRange.start,
    weekRange.end,
    monthRange.start,
    monthRange.end
  );

  const handleLanguageChange = async (locale: 'en' | 'ar') => {
    await setLocale(locale);
    setCurrentLocale(locale);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const inactiveCount = useMemo(() => {
    return allEmployees.filter(e => e.status === EmployeeStatus.INACTIVE).length;
  }, [allEmployees]);

  const loadWageStats = useCallback(async () => {
    if (!user || activeEmployees.length === 0) {
      setWeeklyWages(0);
      setMonthlyWages(0);
      setLoadingStats(false);
      return;
    }

    try {
      setLoadingStats(true);

      const [weeklyCalcs, monthlyCalcs] = await Promise.all([
        calculateWagesForAllEmployees(user.id, activeEmployees, weekRange.start, weekRange.end),
        calculateWagesForAllEmployees(user.id, activeEmployees, monthRange.start, monthRange.end),
      ]);

      setWeeklyWages(getTotalWages(weeklyCalcs));
      setMonthlyWages(getTotalWages(monthlyCalcs));
    } catch (error) {
      console.error('Failed to load wage stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [user, activeEmployees, weekRange, monthRange]);

  useEffect(() => {
    loadWageStats();
  }, [loadWageStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadWageStats(), refreshAttendanceStats()]);
    setRefreshing(false);
  }, [loadWageStats, refreshAttendanceStats]);

  const weeklyAttendanceRate = useMemo(() => {
    return attendanceStats.weeklyTotal > 0
      ? Math.round((attendanceStats.weeklyPresent / attendanceStats.weeklyTotal) * 100)
      : 0;
  }, [attendanceStats.weeklyPresent, attendanceStats.weeklyTotal]);

  const monthlyAttendanceRate = useMemo(() => {
    return attendanceStats.monthlyTotal > 0
      ? Math.round((attendanceStats.monthlyPresent / attendanceStats.monthlyTotal) * 100)
      : 0;
  }, [attendanceStats.monthlyPresent, attendanceStats.monthlyTotal]);

  if ((loadingAll || loadingActive || loadingStats || loadingAttendanceStats) && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <MaterialCommunityIcons name="loading" size={32} className="text-primary" />
      </View>
    );
  }

  const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
    <View className="flex-row items-center gap-2 mb-3">
      <MaterialCommunityIcons name={icon as any} size={24} className="text-primary" />
      <Text variant="large" className="font-bold text-foreground">
        {title}
      </Text>
    </View>
  );

  const RadioItem = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <Pressable onPress={onPress} className="flex-row items-center py-2.5">
      <View
        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
          selected ? 'border-primary' : 'border-muted-foreground'
        }`}
      >
        {selected && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </View>
      <Text variant="p" className="text-foreground">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 pb-8"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Guest Account Conversion Card */}
      {isGuest && (
        <Card className="mb-4 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <SectionHeader icon="account-convert" title={t('profile.createAccountToSave')} />
            <Text variant="muted" className="mb-3 leading-5">
              {t('profile.guestAccountInfo')}
            </Text>
            <Button onPress={() => router.push('/(auth)/convert-guest')}>
              {t('auth.createAccount')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Employee Stats */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="account-group" title={t('profile.employeeStats')} />
          <View className="flex-row gap-3">
            <StatCard value={allEmployees.length} label={t('profile.totalEmployees')} icon="account-group" />
            <StatCard value={activeEmployees.length} label={t('profile.activeEmployees')} color="#10b981" icon="account-check" />
            <StatCard value={inactiveCount} label={t('profile.inactiveEmployees')} color="#ef4444" icon="account-off" />
          </View>
        </CardContent>
      </Card>

      {/* Wage Stats */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="cash-multiple" title={t('profile.wageStats')} />
          <View className="flex-row items-center">
            <View className="flex-1 items-center py-2">
              <Text variant="muted" className="mb-2">
                {t('profile.thisWeek')}
              </Text>
              <Text variant="h3" className="font-bold text-emerald-500">
                {formatCurrency(weeklyWages)}
              </Text>
            </View>
            <View className="w-px h-14 bg-border" />
            <View className="flex-1 items-center py-2">
              <Text variant="muted" className="mb-2">
                {t('profile.thisMonth')}
              </Text>
              <Text variant="h3" className="font-bold text-emerald-500">
                {formatCurrency(monthlyWages)}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Attendance Stats */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="calendar-check" title={t('profile.attendanceStats')} />
          <View className="flex-row justify-around">
            <View className="items-center flex-1">
              <Text variant="muted" className="mb-2">
                {t('profile.thisWeek')}
              </Text>
              <Text variant="h2" className="font-bold text-emerald-500">
                {weeklyAttendanceRate}%
              </Text>
              <Text variant="muted" className="mt-1">
                {attendanceStats.weeklyPresent} / {attendanceStats.weeklyTotal}
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text variant="muted" className="mb-2">
                {t('profile.thisMonth')}
              </Text>
              <Text variant="h2" className="font-bold text-emerald-500">
                {monthlyAttendanceRate}%
              </Text>
              <Text variant="muted" className="mt-1">
                {attendanceStats.monthlyPresent} / {attendanceStats.monthlyTotal}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* History Link */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="history" title={t('history.title')} />
          <Button variant="outline" onPress={() => router.push('/history')}>
            {t('attendance.viewHistory')}
          </Button>
        </CardContent>
      </Card>

      {/* Theme Preference */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="palette" title={t('theme.preference')} />
          <RadioItem
            label={t('theme.light')}
            selected={themeMode === 'light'}
            onPress={() => setThemeMode('light')}
          />
          <RadioItem
            label={t('theme.dark')}
            selected={themeMode === 'dark'}
            onPress={() => setThemeMode('dark')}
          />
          <RadioItem
            label={t('theme.auto')}
            selected={themeMode === 'auto'}
            onPress={() => setThemeMode('auto')}
          />
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="translate" title={t('profile.language')} />
          <RadioItem
            label="English"
            selected={currentLocale === 'en'}
            onPress={() => handleLanguageChange('en')}
          />
          <RadioItem
            label="العربية"
            selected={currentLocale === 'ar'}
            onPress={() => handleLanguageChange('ar')}
          />
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="information-outline" title={t('profile.appInfo')} />
          <View className="flex-row justify-between py-2">
            <Text variant="p" className="text-muted-foreground">
              {t('profile.version')}
            </Text>
            <Text variant="p" className="font-semibold text-foreground">
              1.0.0
            </Text>
          </View>
        </CardContent>
      </Card>

      {/* User Account */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <SectionHeader icon="account-circle" title={t('profile.loggedInAs')} />
          <Text variant="p" className="text-center text-foreground text-lg font-semibold mb-4">
            {user?.username}
          </Text>
          <Button variant="destructive" onPress={handleLogout}>
            {t('profile.logout')}
          </Button>
        </CardContent>
      </Card>
    </ScrollView>
  );
}
