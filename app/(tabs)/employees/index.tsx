import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, FAB, Card, Text, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useEmployees } from '../../../src/hooks';
import { Employee, EmployeeStatus, WageType } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { formatCurrency } from '../../../src/utils/dateUtils';

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading, error, refresh, search } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
      <Card.Content>
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
            {item.status}
          </Chip>
        </View>
        <View style={styles.wageInfo}>
          <Text variant="bodySmall" style={styles.wageLabel}>
            {item.wageType === WageType.DAILY ? 'Daily Rate' : 'Hourly Rate'}:
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
        placeholder="Search employees..."
        onChangeText={onSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : employees.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No employees found</Text>
          <Text style={styles.emptySubtext}>
            Tap the + button to add your first employee
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
        style={styles.fab}
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
    elevation: 2,
  },
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },
  card: {
    marginBottom: sizes.paddingSmall,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
  },
  role: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    textTransform: 'uppercase',
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
    marginTop: sizes.paddingSmall,
  },
  wageLabel: {
    color: colors.textSecondary,
  },
  wageValue: {
    fontWeight: '600',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    right: sizes.padding,
    bottom: sizes.padding,
    backgroundColor: colors.primary,
  },
  error: {
    color: colors.error,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    marginTop: 8,
    color: colors.textLight,
  },
});
