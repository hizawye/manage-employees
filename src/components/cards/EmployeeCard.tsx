import { memo } from 'react';
import { View, Pressable } from 'react-native';
import { Card, CardContent } from '../ui/card';
import { Text } from '../ui/text';
import { Badge } from '../ui/badge';
import { Employee, WageType } from '../../models';
import { formatCurrency } from '../../utils/dateUtils';
import { t } from '../../i18n';

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
}

function EmployeeCardComponent({ employee, onPress }: EmployeeCardProps) {
  return (
    <Pressable onPress={onPress} className="mb-4">
      <Card>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <Text variant="large" className="font-bold text-foreground">
                {employee.name}
              </Text>
              <Text variant="muted" className="mt-1">
                {employee.role}
              </Text>
            </View>
            <Badge variant={employee.status === 'active' ? 'success' : 'destructive'}>
              {employee.status === 'active' ? t('employee.active') : t('employee.inactive')}
            </Badge>
          </View>
          <View className="flex-row items-center pt-3 border-t border-border">
            <Text variant="small" className="text-muted-foreground">
              {employee.wageType === WageType.DAILY
                ? t('employee.dailyRate')
                : t('employee.hourlyRate')}:
            </Text>
            <Text variant="small" className="font-semibold text-primary ml-1.5">
              {formatCurrency(employee.wageRate)}
            </Text>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}

export const EmployeeCard = memo(EmployeeCardComponent);
