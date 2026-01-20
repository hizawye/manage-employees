import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager } from 'react-native';
import { FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useEmployees, useRefresh, useDebounce } from '../../../src/hooks';
import { Employee } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { t } from '../../../src/i18n';
import { LoadingSpinner, EmptyState, ErrorMessage, EmployeeCard, SearchInput } from '../../../src/components';

const isRTL = I18nManager.isRTL;

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading, error, refresh, search } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const { refreshing, onRefresh } = useRefresh(refresh);

  // Execute search when debounced value changes
  useEffect(() => {
    search(debouncedSearch);
  }, [debouncedSearch, search]);

  const renderEmployee = useCallback(({ item }: { item: Employee }) => (
    <EmployeeCard
      employee={item}
      onPress={() => router.push(`/employees/${item.id}`)}
    />
  ), [router]);

  if (loading && !refreshing) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <SearchInput
        placeholder={t('employee.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
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
