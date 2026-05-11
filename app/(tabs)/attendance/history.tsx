import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useEmployees, useRefresh } from '../../../src/hooks';
import { useAuth } from '../../../src/auth/useAuth';
import { StatusChip } from '../../../src/components';
import { getAttendanceInRange } from '../../../src/database/repositories';
import { Attendance, Employee, EmployeeStatus } from '../../../src/models';
import { formatDate, getWeekRange } from '../../../src/utils/dateUtils';
import { addWeeks } from 'date-fns';
import { t } from '../../../src/i18n';
import { Card, CardContent } from '../../../src/components/ui/card';
import { Text } from '../../../src/components/ui/text';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AttendanceWithEmployee extends Attendance {
  employeeName: string;
}

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();
  const { employees } = useEmployees(EmployeeStatus.ACTIVE);
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    const baseDate = addWeeks(new Date(), weekOffset);
    return getWeekRange(baseDate);
  }, [weekOffset]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const emp of employees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [employees]);

  const loadAttendance = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const records = await getAttendanceInRange(user.id, dateRange.start, dateRange.end);
      const withNames = records.map((record) => ({
        ...record,
        employeeName: employeeMap.get(record.employeeId)?.name || 'Unknown',
      }));
      setAttendance(withNames);
    } catch (error) {
      console.error('Failed to load attendance history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, employeeMap]);

  useEffect(() => {
    if (employees.length > 0) {
      loadAttendance();
    }
  }, [loadAttendance, employees.length]);

  const { refreshing, onRefresh } = useRefresh(loadAttendance);

  const renderAttendance = useCallback(({ item }: { item: AttendanceWithEmployee }) => (
    <Card className="mb-2">
      <CardContent className="p-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="large" className="font-semibold text-foreground">
            {item.employeeName}
          </Text>
          <Text variant="muted" className="mt-0.5">
            {formatDate(item.date)}
          </Text>
        </View>
        <StatusChip type="attendance" status={item.status} />
      </CardContent>
    </Card>
  ), []);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" className="text-primary" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-center py-2 bg-card border-b border-border">
        <Pressable onPress={() => setWeekOffset((prev) => prev - 1)} className="p-2">
          <MaterialCommunityIcons name="chevron-left" size={28} className="text-foreground" />
        </Pressable>
        <View className="items-center min-w-[200px]">
          <Text variant="large" className="font-semibold text-foreground">
            {t('attendance.week')}
          </Text>
          <Text variant="muted" className="text-sm mt-0.5">
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </Text>
        </View>
        <Pressable onPress={() => setWeekOffset((prev) => prev + 1)} disabled={weekOffset >= 0} className="p-2">
          <MaterialCommunityIcons name="chevron-right" size={28} className={weekOffset >= 0 ? 'text-muted-foreground' : 'text-foreground'} />
        </Pressable>
      </View>

      {attendance.length === 0 ? (
        <View className="flex-1 justify-center items-center p-4">
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
