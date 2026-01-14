import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';
import { t } from '../../../src/i18n';

export default function WagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerTitleAlign: 'center',
        headerBackTitleVisible: false,
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
