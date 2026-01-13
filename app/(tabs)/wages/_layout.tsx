import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';

export default function WagesLayout() {
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
        options={{ title: 'Wage Summary' }}
      />
      <Stack.Screen
        name="[employeeId]"
        options={{ title: 'Wage Details' }}
      />
    </Stack>
  );
}
