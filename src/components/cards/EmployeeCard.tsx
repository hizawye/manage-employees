import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Employee, EmployeeStatus, WageType } from '../../models';
import { colors, sizes } from '../../constants/theme';
import { formatCurrency } from '../../utils/dateUtils';
import { t } from '../../i18n';

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
}

function EmployeeCardComponent({ employee, onPress }: EmployeeCardProps) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={styles.name}>
              {employee.name}
            </Text>
            <Text variant="bodyMedium" style={styles.role}>
              {employee.role}
            </Text>
          </View>
          <Chip
            compact
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
        <View style={styles.wageInfo}>
          <Text variant="bodySmall" style={styles.wageLabel}>
            {employee.wageType === WageType.DAILY
              ? t('employee.dailyRate')
              : t('employee.hourlyRate')}:
          </Text>
          <Text variant="bodyMedium" style={styles.wageValue}>
            {formatCurrency(employee.wageRate)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export const EmployeeCard = memo(EmployeeCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: sizes.padding,
    backgroundColor: colors.surface,
    borderRadius: sizes.borderRadius,
    elevation: 2,
  },
  cardContent: {
    padding: sizes.padding,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginEnd: sizes.paddingSmall,
  },
  name: {
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  },
  role: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  statusChip: {
    height: 28,
    borderRadius: sizes.borderRadius,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  activeChip: {
    backgroundColor: colors.success,
  },
  inactiveChip: {
    backgroundColor: colors.textLight,
  },
  wageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sizes.padding,
    paddingTop: sizes.paddingSmall,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  wageLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  wageValue: {
    fontWeight: '600',
    marginStart: 6,
    color: colors.primary,
    fontSize: 15,
  },
});
