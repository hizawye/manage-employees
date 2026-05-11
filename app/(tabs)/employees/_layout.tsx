import { Stack } from 'expo-router';
import { t } from '../../../src/i18n';

const primary = '#3b82f6';

export default function EmployeesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
        headerTitleAlign: 'center',
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
