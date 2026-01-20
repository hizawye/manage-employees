import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEmployee, useEmployees } from '../../../src/hooks';
import { StatusChip, InfoRow } from '../../../src/components';
import { WageType, EmployeeStatus } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { formatDate, formatCurrency } from '../../../src/utils/dateUtils';
import { t } from '../../../src/i18n';

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !employee) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || t('employee.employeeNotFound')}</Text>
        <Button mode="outlined" onPress={() => router.back()} style={styles.backButton}>
          {t('common.goBack')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.name}>
              {employee.name}
            </Text>
            <StatusChip type="employee" status={employee.status} compact={false} />
          </View>

          <Text variant="titleMedium" style={styles.role}>
            {employee.role}
          </Text>

          <Divider style={styles.divider} />

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

          {employee.notes && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.label}>{t('employee.notes')}:</Text>
              <Text style={styles.notes}>{employee.notes}</Text>
            </>
          )}
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => router.push(`/employees/edit/${id}`)}
          style={styles.button}
          icon="pencil"
        >
          {t('common.edit')}
        </Button>
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.button}
          icon="delete"
          textColor={colors.error}
        >
          {t('common.delete')}
        </Button>
      </View>
    </ScrollView>
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
  card: {
    margin: sizes.padding,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontWeight: 'bold',
    flex: 1,
  },
  role: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    marginVertical: sizes.padding,
  },
  notes: {
    marginTop: sizes.paddingSmall,
    color: colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: sizes.padding,
    gap: sizes.paddingSmall,
  },
  button: {
    flex: 1,
  },
  error: {
    color: colors.error,
    marginBottom: sizes.padding,
  },
  backButton: {
    marginTop: sizes.padding,
  },
});
