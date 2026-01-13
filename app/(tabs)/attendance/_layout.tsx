import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';
import { t } from '../../../src/i18n';

export default function AttendanceLayout() {
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
        options={{ title: t('attendance.title') }}
      />
      <Stack.Screen
        name="history"
        options={{ title: t('attendance.history') }}
      />
    </Stack>
  );
}
