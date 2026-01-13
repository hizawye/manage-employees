import { Stack } from 'expo-router';
import { colors } from '../../../src/constants/theme';

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
        options={{ title: 'Mark Attendance' }}
      />
      <Stack.Screen
        name="history"
        options={{ title: 'Attendance History' }}
      />
    </Stack>
  );
}
