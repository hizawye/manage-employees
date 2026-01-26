import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { t } from '../../../src/i18n';

export default function AttendanceLayout() {
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
        options={{ title: t('attendance.title') }}
      />
      <Stack.Screen
        name="history"
        options={{ title: t('attendance.history') }}
      />
    </Stack>
  );
}
