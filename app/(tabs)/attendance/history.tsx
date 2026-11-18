import { useState, useCallback, useMemo, useRef } from 'react';
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator, I18nManager } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components/common/StatusChip';
import { getAttendanceHistoryInRange, type AttendanceHistoryEntry } from '../../../src/database/repositories';
import { formatDate, getWeekRange } from '../../../src/utils/dateUtils';
import { addWeeks } from 'date-fns';
import { getLocale, t } from '../../../src/i18n';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const latestRequest = useRef(0);

  const dateRange = useMemo(() => {
    const baseDate = addWeeks(new Date(), weekOffset);
    return getWeekRange(baseDate);
  }, [weekOffset]);

  const loadAttendance = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoadFailed(false);
    if (!user) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const records = await getAttendanceHistoryInRange(user.id, dateRange.start, dateRange.end);
      if (request === latestRequest.current) setAttendance(records);
    } catch {
      if (request === latestRequest.current) {
        setAttendance([]);
        setLoadFailed(true);
      }
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [user, dateRange]);

  useFocusEffect(useCallback(() => {
    void loadAttendance();
    return () => { latestRequest.current++; };
  }, [loadAttendance]));

  const { refreshing, onRefresh } = useRefresh(loadAttendance);

  const renderAttendance = useCallback(({ item }: { item: AttendanceHistoryEntry }) => (
    <View className="mb-2 rounded-xl border border-border bg-card overflow-hidden">
      <View className="p-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="large" className="font-semibold text-foreground">
            {item.employeeName}
          </Text>
          <Text variant="muted" className="mt-0.5">
            {formatDate(item.date)}
          </Text>
          {item.hoursWorked !== undefined && (
            <Text variant="muted" className="mt-1">
              {t('attendance.recordedHours', { hours: item.hoursWorked.toLocaleString(getLocale(), { maximumFractionDigits: 20 }) })}
            </Text>
          )}
        </View>
        <StatusChip type="attendance" status={item.status} />
      </View>
    </View>
  ), []);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-center py-2 bg-card border-b border-border">
        <Pressable accessibilityRole="button" accessibilityLabel={t('attendance.previousWeek')} onPress={() => setWeekOffset((prev) => prev - 1)} className="p-2">
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'} size={28} className="text-foreground" />
        </Pressable>
        <View className="items-center min-w-[200px]">
          <Text variant="large" className="font-semibold text-foreground">
            {t('attendance.week')}
          </Text>
          <Text variant="muted" className="text-sm mt-0.5">
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('attendance.nextWeek')} onPress={() => setWeekOffset((prev) => prev + 1)} disabled={weekOffset >= 0} className="p-2">
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'} size={28} className={weekOffset >= 0 ? 'text-muted-foreground' : 'text-foreground'} />
        </Pressable>
      </View>

      {loadFailed ? (
        <View className="flex-1 items-center justify-center gap-3 px-4">
          <Text>{t('attendance.historyLoadError')}</Text>
          <Button variant="outline" onPress={loadAttendance}>{t('common.retry')}</Button>
        </View>
      ) : attendance.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text variant="h4" className="text-center text-muted-foreground mb-2">
            {t('attendance.noRecords')}
          </Text>
          <Text variant="muted" className="text-center">
            {t('attendance.noRecordsHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.id}
          renderItem={renderAttendance}
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
