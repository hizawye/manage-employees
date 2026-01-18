import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager, TextInput } from 'react-native';
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Debounced search - only search after user stops typing
  const onSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Search after 500ms of no typing
      searchTimeoutRef.current = setTimeout(() => {
        search(query);
      }, 500);
    },
    [search]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
        onChangeText={onSearchChange}
        value={searchQuery}
        style={[styles.searchBar, isRTL && styles.searchBarRTL]}
        inputStyle={styles.searchInput}
        iconColor={colors.primary}
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
  searchBarRTL: {
    flexDirection: 'row-reverse',
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
