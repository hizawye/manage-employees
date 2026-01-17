import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { Searchbar, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees } from '../../../src/hooks';
import { Employee } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { t } from '../../../src/i18n';
import { LoadingSpinner, EmptyState, ErrorMessage, EmployeeCard } from '../../../src/components';

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
    <EmployeeCard
      employee={item}
      onPress={() => router.push(`/employees/${item.id}`)}
    />
  );

  if (loading && !refreshing) {
    return <LoadingSpinner />;
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
        <ErrorMessage message={error} />
      ) : employees.length === 0 ? (
        <EmptyState
          title={t('employee.noEmployees')}
          subtitle={t('employee.noEmployeesHint')}
        />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployee}
          contentContainerStyle={styles.list}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
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
});
