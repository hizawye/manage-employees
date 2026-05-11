import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Surface, ActivityIndicator, Chip, useTheme, IconButton, Button } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useLogs } from '../../src/hooks';
import { Log, LogActionType } from '../../src/models';
import { t } from '../../src/i18n';
import { sizes } from '../../src/constants/theme';

type FilterType = 'all' | 'employee' | 'attendance';

export default function HistoryScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const [filter, setFilter] = useState<FilterType>('all');

    const entityType = filter === 'all' ? undefined : filter;
    const { logs, loading, loadingMore, error, hasMore, refresh, loadMore } = useLogs(entityType);

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
                default:
                    return item.description;
            }
        } catch (e) {
            return item.description;
        }
    }, []);

    const renderLogItem = useCallback(({ item }: { item: Log }) => {
        let icon = 'circle-small';
        let iconColor = colors.primary;

        if (item.action.includes('create') || item.action.includes('mark')) {
            icon = 'plus-circle-outline';
            iconColor = colors.tertiary;
        } else if (item.action.includes('update')) {
            icon = 'pencil-circle-outline';
            iconColor = colors.secondary;
        } else if (item.action.includes('delete')) {
            icon = 'delete-circle-outline';
            iconColor = colors.error;
        }

        return (
            <Surface style={[styles.logItem, { backgroundColor: colors.surface }]} elevation={1}>
                <View style={styles.logHeader}>
                    <View style={styles.logIconRow}>
                        <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginStart: 8 }}>
                            {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                        </Text>
                    </View>
                    {item.entityType && (
                        <Chip style={{ height: 24 }} textStyle={{ fontSize: 10, lineHeight: 10, marginVertical: 0, marginHorizontal: 8 }}>
                            {item.entityType === 'employee' ? t('history.filterEmployee') : item.entityType === 'attendance' ? t('history.filterAttendance') : item.entityType}
                        </Chip>
                    )}
                </View>
                <Text variant="bodyMedium" style={styles.logDescription}>
                    {getLogMessage(item)}
                </Text>
            </Surface>
        );
    }, [colors, getLogMessage]);

    const renderFooter = () => {
        if (loadingMore) {
            return (
                <View style={styles.footer}>
                    <ActivityIndicator size="small" />
                </View>
            );
        }
        if (hasMore && logs.length > 0) {
            return (
                <View style={styles.footer}>
                    <Button mode="text" onPress={loadMore} loading={loadingMore}>
                        {t('common.loadMore')}
                    </Button>
                </View>
            );
        }
        return null;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <IconButton
                    icon="arrow-left"
                    onPress={() => router.back()}
                />
                <Text variant="titleLarge" style={styles.headerTitle}>
                    {t('history.title')}
                </Text>
            </View>

            <View style={styles.filterRow}>
                <Chip
                    selected={filter === 'all'}
                    onPress={() => setFilter('all')}
                    style={styles.filterChip}
                    showSelectedOverlay
                >
                    {t('history.filterAll')}
                </Chip>
                <Chip
                    selected={filter === 'employee'}
                    onPress={() => setFilter('employee')}
                    style={styles.filterChip}
                    showSelectedOverlay
                >
                    {t('history.filterEmployee')}
                </Chip>
                <Chip
                    selected={filter === 'attendance'}
                    onPress={() => setFilter('attendance')}
                    style={styles.filterChip}
                    showSelectedOverlay
                >
                    {t('history.filterAttendance')}
                </Chip>
            </View>

            {loading && logs.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Text style={{ color: colors.error }}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    renderItem={renderLogItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={loading && logs.length > 0} onRefresh={refresh} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ color: colors.onSurfaceVariant }}>{t('history.empty')}</Text>
                        </View>
                    }
                    ListFooterComponent={renderFooter}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 8,
        elevation: 2,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerTitle: {
        fontWeight: '600',
        marginLeft: 8,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 200,
    },
    filterRow: {
        flexDirection: 'row',
        padding: sizes.padding,
        gap: 8,
    },
    filterChip: {
        flex: 1,
    },
    list: {
        padding: sizes.padding,
        paddingTop: 0,
    },
    logItem: {
        padding: sizes.padding,
        marginBottom: sizes.paddingSmall,
        borderRadius: sizes.borderRadius,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    logIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logDescription: {
        marginStart: 32,
    },
    footer: {
        paddingVertical: sizes.padding,
        alignItems: 'center',
    },
});
