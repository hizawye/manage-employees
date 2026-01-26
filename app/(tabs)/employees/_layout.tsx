import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { t } from '../../../src/i18n';

export default function EmployeesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
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
