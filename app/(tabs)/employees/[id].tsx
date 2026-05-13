import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEmployee, useEmployees } from '../../../src/hooks';
import { StatusChip } from '../../../src/components/common/StatusChip';
import { InfoRow } from '../../../src/components/common/InfoRow';
import { WageType } from '../../../src/models';
import { formatDate, formatCurrency } from '../../../src/utils/dateUtils';
import { t } from '../../../src/i18n';
import { Text } from '../../../src/components/ui/text';
import { Button } from '../../../src/components/ui/button';

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { employee, loading, error } = useEmployee(id);
  const { removeEmployee } = useEmployees();

  const handleDelete = () => {
    Alert.alert(
      t('employee.deleteConfirmTitle'),
      t('employee.deleteConfirmMessage', { name: employee?.name || '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await removeEmployee(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !employee) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-destructive text-center mb-4">
          {error || t('employee.employeeNotFound')}
        </Text>
        <Button variant="outline" onPress={() => router.back()}>
          {t('common.goBack')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="mx-4 mt-4 mb-2 rounded-xl border border-border bg-card overflow-hidden">
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <Text variant="h2" className="font-bold text-foreground flex-1">
              {employee.name}
            </Text>
            <StatusChip type="employee" status={employee.status} />
          </View>

          <Text variant="p" className="text-muted-foreground mb-4">
            {employee.role}
          </Text>

          <View className="border-t border-border pt-2">
            <InfoRow label={t('employee.phone')} value={employee.phone} icon="phone" />
            <InfoRow
              label={t('employee.wageType')}
              value={employee.wageType === WageType.DAILY ? t('employee.dailyRate') : t('employee.hourlyRate')}
              icon="cash"
            />
            <InfoRow
              label={employee.wageType === WageType.DAILY ? t('employee.dailyRate') : t('employee.hourlyRate')}
              value={formatCurrency(employee.wageRate)}
              icon="currency-usd"
            />
            <InfoRow label={t('employee.joinDate')} value={formatDate(employee.joinDate)} icon="calendar" />
          </View>

          {employee.notes && (
            <>
              <View className="border-t border-border pt-3 mt-2">
                <Text variant="label" className="font-semibold text-foreground mb-2">
                  {t('employee.notes')}:
                </Text>
                <Text variant="p" className="text-foreground leading-5">
                  {employee.notes}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View className="flex-row px-4 gap-3 pb-4">
        <Button
          className="flex-1"
          onPress={() => router.push(`/employees/edit/${id}`)}
        >
          {t('common.edit')}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onPress={handleDelete}
        >
          <Text className="text-destructive">{t('common.delete')}</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
