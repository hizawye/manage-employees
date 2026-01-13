import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';

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
        options={{ title: 'Employees' }}
      />
      <Stack.Screen
        name="add"
        options={{ title: 'Add Employee', presentation: 'modal' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Employee Details' }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{ title: 'Edit Employee', presentation: 'modal' }}
      />
    </Stack>
  );
}
