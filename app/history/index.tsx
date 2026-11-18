import { useEffect, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator, I18nManager } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency, formatDate } from '../../src/utils/dateUtils';
import { useLogs, useRefresh } from '../../src/hooks';
import { Log, LogActionType, LogCategory } from '../../src/models';
import { getLocale, t } from '../../src/i18n';
import { Text } from '../../src/components/ui/text';
import { Card, CardContent } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Badge } from '../../src/components/ui/badge';
import { useAuth } from '../../src/auth/useAuth';

type FilterType = 'all' | LogCategory;
const filters = { all: 'history.filterAll', employee: 'history.filterEmployee', attendance: 'history.filterAttendance', payroll: 'history.filterPayroll' } as const;

export default function HistoryScreen() {
    const router = useRouter();
    const backIcon = I18nManager.isRTL ? 'arrow-right' : 'arrow-left';
    const { user, isLoading } = useAuth();
    const [filter, setFilter] = useState<FilterType>('all');

    const entityType = filter === 'all' ? undefined : filter;
    const { logs, loading, loadingMore, error, hasMore, refresh, loadMore } = useLogs(entityType);
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/(auth)/login');
        }
    }, [isLoading, user, router]);

    // Separate refreshing state prevents flickering
    const { refreshing, onRefresh } = useRefresh(async () => {
      await refresh();
    });

    const getLogMessage = useCallback((item: Log) => {
        try {
            const details = item.details ? JSON.parse(item.details) : {};
            const name = details.employeeName || details.name || item.entityId?.substring(0, 8);

            let status = details.status;
            if (status === 'present') status = t('attendance.present');
            else if (status === 'absent') status = t('attendance.absent');
            else if (status === 'half_day') status = t('attendance.halfDay');

            switch (item.action) {
                case LogActionType.CREATE_EMPLOYEE:
                    return t('history.logTemplates.create_employee', { name });
                case LogActionType.UPDATE_EMPLOYEE:
                    return t('history.logTemplates.update_employee', { name });
                case LogActionType.DELETE_EMPLOYEE:
                    return t('history.logTemplates.delete_employee', { name });
                case LogActionType.MARK_ATTENDANCE:
                    return t('history.logTemplates.mark_attendance', { name, status });
                case LogActionType.UPDATE_ATTENDANCE:
                    return t('history.logTemplates.update_attendance', { name, status });
                case LogActionType.DELETE_ATTENDANCE:
                    return t('history.logTemplates.delete_attendance');
                case LogActionType.CREATE_PAYMENT:
                case LogActionType.DELETE_PAYMENT:
                case LogActionType.CREATE_ADJUSTMENT:
                case LogActionType.UPDATE_ADJUSTMENT:
                case LogActionType.DELETE_ADJUSTMENT:
                    return t('history.logTemplates.' + item.action, {
                        name: details.employeeName || t('history.unknownEmployee'),
                        amount: formatCurrency(details.amount),
                        previous: formatCurrency(details.previousAmount ?? 0),
                    });
                default:
                    return item.description;
            }
        } catch {
            return item.description;
        }
    }, []);

    const renderLogItem = useCallback(({ item }: { item: Log }) => {
        let icon = 'circle-small' as any;
        let iconColor = 'text-primary';

        if (item.action.includes('create') || item.action.includes('mark')) {
            icon = 'plus-circle-outline';
            iconColor = 'text-emerald-500';
        } else if (item.action.includes('update')) {
            icon = 'pencil-circle-outline';
            iconColor = 'text-blue-500';
        } else if (item.action.includes('delete')) {
            icon = 'delete-circle-outline';
            iconColor = 'text-red-500';
        }

        return (
            <Card className="mb-2">
                <CardContent className="p-4">
                    <View className="flex-row justify-between items-center mb-1">
                        <View className="flex-row items-center gap-2">
                            <MaterialCommunityIcons name={icon} size={22} className={iconColor} />
                            <Text variant="muted" className="text-sm">
                                {formatDate(item.createdAt)} · {new Date(item.createdAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        {item.entityType && (
                            <Badge variant="secondary">
                                {t(filters[item.entityType])}
                            </Badge>
                        )}
                    </View>
                    <Text variant="p" className="ml-7">
                        {getLogMessage(item)}
                    </Text>
                </CardContent>
            </Card>
        );
    }, [getLogMessage]);

    const renderFooter = () => {
        if (loadingMore) {
            return (
                <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#3b82f6" />
                </View>
            );
        }
        if (error && logs.length) {
            return <View className="items-center p-4">
                <Text className="text-destructive">{error}</Text>
                <Button variant="ghost" onPress={hasMore ? loadMore : refresh}>{t('common.retry')}</Button>
            </View>;
        }
        if (hasMore && logs.length > 0) {
            return (
                <View className="py-4 items-center">
                    <Button variant="ghost" onPress={loadMore}>
                        {t('common.loadMore')}
                    </Button>
                </View>
            );
        }
        return null;
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View className="flex-row items-center px-2 py-2 bg-card border-b border-border">
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.goBack')} onPress={() => router.back()} className="p-2">
                    <MaterialCommunityIcons name={backIcon} size={24} className="text-foreground" />
                </Pressable>
                <Text variant="h3" className="font-semibold ml-2 text-foreground">
                    {t('history.title')}
                </Text>
            </View>

            <View className="flex-row flex-wrap px-3 py-3 gap-1">
                {(Object.keys(filters) as FilterType[]).map((f) => (
                    <Pressable
                        key={f}
                        accessibilityRole="button" accessibilityState={{ selected: filter === f }}
                        onPress={() => setFilter(f)}
                        className={`flex-1 py-2 rounded-lg items-center justify-center border ${
                            filter === f ? 'bg-primary border-primary' : 'bg-card border-border'
                        }`}
                    >
                        <Text className={`text-sm font-medium ${filter === f ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {t(filters[f])}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* Initial loading: show spinner only, no list */}
            {(isLoading || (!user && !isLoading)) || (loading && !refreshing && logs.length === 0) ? (
                <View className="flex-1 justify-center items-center p-5 min-h-[200px]">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : error && !loading && logs.length === 0 ? (
                <View className="flex-1 justify-center items-center p-5 min-h-[200px]">
                    <Text className="text-destructive text-center">{error}</Text>
                    <Button variant="ghost" onPress={refresh}>{t('common.retry')}</Button>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    renderItem={renderLogItem}
                    keyExtractor={item => item.id}
                    contentContainerClassName="px-4 pb-4 min-h-[200px]"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 justify-center items-center p-5 min-h-[200px]">
                            <Text className="text-muted-foreground text-center">{t('history.empty')}</Text>
                        </View>
                    }
                    ListFooterComponent={renderFooter}
                />
            )}
        </SafeAreaView>
    );
}
