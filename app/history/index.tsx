import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Surface, ActivityIndicator, Chip, useTheme, IconButton } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../src/auth/useAuth';
import { getLogs } from '../../src/database/repositories';
import { Log } from '../../src/models';
import { t } from '../../src/i18n';
import { sizes } from '../../src/constants/theme';

export default function HistoryScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { user } = useAuth();

    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'employee' | 'attendance'>('all');
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadLogs = useCallback(async (refresh = false) => {
        if (!user) return;

        try {
            if (refresh) setLoading(true);

            const pageSize = 50;
            const offset = refresh ? 0 : page * pageSize;

            // Note: Filtering is currently done client-side for simplicity
            const newLogs = await getLogs(user.id, pageSize, offset);

            let filteredLogs = newLogs;
            if (filter === 'employee') {
                filteredLogs = newLogs.filter(l => l.entityType === 'employee');
            } else if (filter === 'attendance') {
                filteredLogs = newLogs.filter(l => l.entityType === 'attendance');
            }

            if (refresh) {
                setLogs(filteredLogs);
                setPage(1);
            } else {
                setLogs(prev => [...prev, ...filteredLogs]);
                setPage(prev => prev + 1);
            }

            setHasMore(newLogs.length === pageSize);

        } catch (error) {
            console.error('Failed to load logs', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, filter, page]);

    useEffect(() => {
        loadLogs(true);
    }, [filter]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadLogs(true);
    }, [loadLogs]);

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
                        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}>
                            {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                        </Text>
                    </View>
                    {item.entityType && (
                        <Chip style={{ height: 24 }} textStyle={{ fontSize: 10, lineHeight: 10, marginVertical: 0, marginHorizontal: 8 }}>
                            {item.entityType}
                        </Chip>
                    )}
                </View>
                <Text variant="bodyMedium" style={styles.logDescription}>
                    {item.description}
                </Text>
            </Surface>
        );
    }, [colors]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { backgroundColor: colors.surface }]}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
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

            {loading && !refreshing && logs.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={logs}
                    renderItem={renderLogItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ color: colors.onSurfaceVariant }}>{t('history.empty')}</Text>
                        </View>
                    }
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
        marginLeft: 32, // Indent to align with text start of header
    },
});
