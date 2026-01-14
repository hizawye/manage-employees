import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { Searchbar, FAB, Card, Text, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees } from '../../../src/hooks';
import { Employee, EmployeeStatus, WageType } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { formatCurrency } from '../../../src/utils/dateUtils';
import { t } from '../../../src/i18n';

const isRTL = I18nManager.isRTL;

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading, error, refresh, search } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const onSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      await search(query);
    },
    [search]
  );

  const renderEmployee = ({ item }: { item: Employee }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/employees/${item.id}`)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={styles.name}>
              {item.name}
            </Text>
            <Text variant="bodyMedium" style={styles.role}>
              {item.role}
            </Text>
          </View>
          <Chip
            compact
            style={[
              styles.statusChip,
              item.status === EmployeeStatus.ACTIVE
                ? styles.activeChip
                : styles.inactiveChip,
            ]}
            textStyle={styles.statusText}
          >
            {item.status === EmployeeStatus.ACTIVE
              ? t('employee.active')
              : t('employee.inactive')}
          </Chip>
        </View>
        <View style={styles.wageInfo}>
          <Text variant="bodySmall" style={styles.wageLabel}>
            {item.wageType === WageType.DAILY
              ? t('employee.dailyRate')
              : t('employee.hourlyRate')}:
          </Text>
          <Text variant="bodyMedium" style={styles.wageValue}>
            {formatCurrency(item.wageRate)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={t('employee.searchPlaceholder')}
        onChangeText={onSearch}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('employee.noEmployees')}</Text>
          <Text style={styles.emptySubtext}>
            {t('employee.noEmployeesHint')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployee}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, isRTL && styles.fabRTL]}
        onPress={() => router.push('/employees/add')}
      />
    </View>
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
    padding: sizes.padding,
  },
  searchBar: {
    margin: sizes.padding,
    borderRadius: sizes.borderRadius,
    elevation: 2,
  },
  searchInput: {
    textAlign: isRTL ? 'right' : 'left',
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  card: {
    marginBottom: sizes.padding,
    backgroundColor: colors.surface,
    borderRadius: sizes.borderRadius,
    elevation: 2,
  },
  cardContent: {
    padding: sizes.padding,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginEnd: sizes.paddingSmall,
  },
  name: {
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  },
  role: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  statusChip: {
    height: 28,
    borderRadius: sizes.borderRadius,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  activeChip: {
    backgroundColor: colors.success,
  },
  inactiveChip: {
    backgroundColor: colors.textLight,
  },
  wageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sizes.padding,
    paddingTop: sizes.paddingSmall,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  wageLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  wageValue: {
    fontWeight: '600',
    marginStart: 6,
    color: colors.primary,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: sizes.padding,
    bottom: sizes.padding,
    backgroundColor: colors.primary,
    borderRadius: sizes.borderRadiusLarge,
  },
  fabRTL: {
    right: undefined,
    left: sizes.padding,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    fontSize: 15,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 12,
    color: colors.textLight,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
