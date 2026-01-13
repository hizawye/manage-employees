import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';
import { t } from '../../../src/i18n';

export default function EmployeesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: t('employee.title') }}
      />
      <Stack.Screen
        name="add"
        options={{ title: t('employee.addEmployee'), presentation: 'modal' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: t('employee.employeeDetails') }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{ title: t('employee.editEmployee'), presentation: 'modal' }}
      />
    </Stack>
  );
}
