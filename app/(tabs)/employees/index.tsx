import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, I18nManager, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEmployees, useRefresh } from '../../../src/hooks';
import { Employee, EmployeeStatus } from '../../../src/models';
import { filterEmployees } from '../../../src/utils/employeeDirectory';
import { t } from '../../../src/i18n';
import { EmployeeCard } from '../../../src/components/cards/EmployeeCard';
import { SearchInput } from '../../../src/components/forms/SearchInput';

const isRTL = I18nManager.isRTL;

export default function EmployeeListScreen() {
  const router = useRouter();
  const { employees, loading, error, refresh } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');

  const [status, setStatus] = useState<EmployeeStatus>();
  const displayed = useMemo(() => filterEmployees(employees, searchQuery, status), [employees, searchQuery, status]);
  const filtered = !!status || !!searchQuery.trim();

  const { refreshing, onRefresh } = useRefresh(refresh);

  const renderEmployee = useCallback(({ item }: { item: Employee }) => (
    <EmployeeCard
      employee={item}
      onPress={() => router.push(`/employees/${item.id}`)}
    />
  ), [router]);

  if (loading && !refreshing && !employees.length) {
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
        {t(filtered ? 'employee.noMatches' : 'employee.noEmployees')}
      </Text>
      {filtered ? <Pressable accessibilityRole="button" className="min-h-12 justify-center" onPress={() => { setSearchQuery(''); setStatus(undefined); }}>
        <Text className="text-primary">{t('employee.clearFilters')}</Text>
      </Pressable> : <Text className="text-sm text-center text-muted-foreground">{t('employee.noEmployeesHint')}</Text>}
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

      <View className="flex-row flex-wrap gap-2 mx-4 mb-3">
        {([undefined, EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE] as const).map(option => (
          <Pressable key={option ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: status === option }}
            onPress={() => setStatus(option)} className={`min-h-11 justify-center px-4 rounded-xl border ${status === option ? 'bg-primary border-primary' : 'bg-card border-border'}`}>
            <Text className={status === option ? 'text-primary-foreground' : 'text-foreground'}>{t('employee.' + (option ?? 'allStatuses'))}</Text>
          </Pressable>
        ))}
      </View>
      {displayed.length === 0
        ? emptyContent
        : (
          <FlatList
            data={displayed}
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
        accessibilityRole="button" accessibilityLabel={t('employee.addEmployee')}
        onPress={() => router.push('/employees/add')}
        className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} w-14 h-14 rounded-2xl bg-primary items-center justify-center shadow-lg active:opacity-90`}
        style={{ elevation: 6 }}
      >
        <MaterialCommunityIcons name="plus" size={28} color="white" />
      </Pressable>
    </View>
  );
}