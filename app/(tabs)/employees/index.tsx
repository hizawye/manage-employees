import { useState, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl, Pressable, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees, useRefresh, useDebounce } from '../../../src/hooks';
import { Employee } from '../../../src/models';
import { t } from '../../../src/i18n';
import { LoadingSpinner, EmptyState, ErrorMessage, EmployeeCard, SearchInput } from '../../../src/components';

const isRTL = I18nManager.isRTL;

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading, error, refresh, search } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const { refreshing, onRefresh } = useRefresh(refresh);

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
    <View className="flex-1 bg-background">
      <SearchInput
        placeholder={t('employee.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        className="mx-4 mt-4 mb-2"
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
          contentContainerClassName="px-4 pb-4"
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <Pressable
        onPress={() => router.push('/employees/add')}
        className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 rounded-2xl bg-primary items-center justify-center shadow-lg active:opacity-90`}
        style={{ elevation: 6 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </Pressable>
    </View>
  );
}
