import { Stack } from 'expo-router';
import { t } from '../../../src/i18n';

const primary = '#3b82f6';

export default function AttendanceLayout() {
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
        options={{ title: t('attendance.title') }}
      />
      <Stack.Screen
        name="history"
        options={{ title: t('attendance.history') }}
      />
    </Stack>
  );
}
