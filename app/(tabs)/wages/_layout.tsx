import { Stack } from 'expo-router';
import { t } from '../../../src/i18n';

const primary = '#3b82f6';

export default function WagesLayout() {
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
        options={{ title: t('wages.title') }}
      />
      <Stack.Screen
        name="[employeeId]"
        options={{ title: t('wages.wageDetails') }}
      />
    </Stack>
  );
}
