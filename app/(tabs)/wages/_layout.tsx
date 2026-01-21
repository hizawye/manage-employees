import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { t } from '../../../src/i18n';

export default function WagesLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
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
