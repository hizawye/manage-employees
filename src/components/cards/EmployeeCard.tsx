import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { Employee, WageType } from '../../models';
import { StatusChip } from '../common/StatusChip';
import { sizes, rtlStyles } from '../../constants/theme';
import { formatCurrency } from '../../utils/dateUtils';
import { t } from '../../i18n';

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
}

function EmployeeCardComponent({ employee, onPress }: EmployeeCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]} onPress={onPress}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text variant="titleMedium" style={[styles.name, { color: colors.onSurface }]}>
              {employee.name}
            </Text>
            <Text variant="bodyMedium" style={[styles.role, { color: colors.onSurfaceVariant }]}>
              {employee.role}
            </Text>
          </View>
          <StatusChip type="employee" status={employee.status} compact={false} />
        </View>
        <View style={[styles.wageInfo, { borderTopColor: colors.outlineVariant }]}>
          <Text variant="bodySmall" style={[styles.wageLabel, { color: colors.onSurfaceVariant }]}>
            {employee.wageType === WageType.DAILY
              ? t('employee.dailyRate')
              : t('employee.hourlyRate')}:
          </Text>
          <Text variant="bodyMedium" style={[styles.wageValue, { color: colors.primary }]}>
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
    borderRadius: sizes.borderRadius,
    elevation: 2,
  },
  cardContent: {
    padding: sizes.padding,
  },
  cardHeader: {
    ...rtlStyles.row,
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
  },
  role: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  wageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sizes.padding,
    paddingTop: sizes.paddingSmall,
    borderTopWidth: 1,
  },
  wageLabel: {
    fontSize: 13,
  },
  wageValue: {
    fontWeight: '600',
    marginStart: 6,
    fontSize: 15,
  },
});
