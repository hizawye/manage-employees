import { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, I18nManager, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees, useRefresh, useDebounce } from '../../../src/hooks';
import { Employee } from '../../../src/models';
import { t } from '../../../src/i18n';
import { EmployeeCard } from '../../../src/components/cards/EmployeeCard';
import { SearchInput } from '../../../src/components/forms/SearchInput';

const isRTL = I18nManager.isRTL;

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading, error, refresh, search } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

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
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const emptyContent = error ? (
    <View className="flex-1 justify-center items-center px-4">
      <Text className="text-destructive text-center text-base">{error}</Text>
    </View>
  ) : (
    <View className="flex-1 justify-center items-center px-4">
      <Text className="text-xl font-semibold text-center text-muted-foreground mb-2">
        {t('employee.noEmployees')}
      </Text>
      <Text className="text-sm text-center text-muted-foreground/60">
        {t('employee.noEmployeesHint')}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <SearchInput
        placeholder={t('employee.searchPlaceholder')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        className="mx-4 mt-4 mb-2"
      />

      {employees.length === 0
        ? emptyContent
        : (
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