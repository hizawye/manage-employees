import { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, I18nManager, TextInput, TouchableOpacity } from 'react-native';
import { FAB, IconButton } from 'react-native-paper';
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

      // Search after 300ms of no typing (faster now with client-side filtering)
      searchTimeoutRef.current = setTimeout(() => {
        search(query);
      }, 300);
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
      {/* Custom RTL-friendly search bar */}
      <View style={styles.searchContainer}>
        <IconButton
          icon="magnify"
          size={24}
          iconColor={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder={t('employee.searchPlaceholder')}
          onChangeText={onSearchChange}
          value={searchQuery}
          style={styles.searchInput}
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <IconButton
            icon="close"
            size={20}
            iconColor={colors.textSecondary}
            onPress={() => onSearchChange('')}
            style={styles.clearIcon}
          />
        )}
      </View>

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
  searchContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: sizes.borderRadius,
    margin: sizes.padding,
    elevation: 2,
    paddingHorizontal: 4,
  },
  searchIcon: {
    margin: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: isRTL ? 'right' : 'left',
    paddingVertical: 12,
  },
  clearIcon: {
    margin: 0,
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
