import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Divider, ActivityIndicator, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEmployee, useEmployees } from '../../../src/hooks';
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
            <Chip
              style={[
                styles.statusChip,
                employee.status === EmployeeStatus.ACTIVE
                  ? styles.activeChip
                  : styles.inactiveChip,
              ]}
              textStyle={styles.statusText}
            >
              {employee.status === EmployeeStatus.ACTIVE
                ? t('employee.active')
                : t('employee.inactive')}
            </Chip>
          </View>

          <Text variant="titleMedium" style={styles.role}>
            {employee.role}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('employee.phone')}:</Text>
            <Text style={styles.value}>{employee.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('employee.wageType')}:</Text>
            <Text style={styles.value}>
              {employee.wageType === WageType.DAILY
                ? t('employee.dailyRate')
                : t('employee.hourlyRate')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              {employee.wageType === WageType.DAILY
                ? t('employee.dailyRate')
                : t('employee.hourlyRate')}:
            </Text>
            <Text style={[styles.value, styles.wage]}>
              {formatCurrency(employee.wageRate)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('employee.joinDate')}:</Text>
            <Text style={styles.value}>{formatDate(employee.joinDate)}</Text>
          </View>

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
  statusChip: {
    height: 28,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    textTransform: 'uppercase',
  },
  activeChip: {
    backgroundColor: colors.success,
  },
  inactiveChip: {
    backgroundColor: colors.textLight,
  },
  divider: {
    marginVertical: sizes.padding,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sizes.paddingSmall,
  },
  label: {
    color: colors.textSecondary,
  },
  value: {
    fontWeight: '500',
  },
  wage: {
    color: colors.primary,
    fontWeight: 'bold',
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
