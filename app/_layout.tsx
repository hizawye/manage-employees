// CRITICAL: Import i18n FIRST to initialize RTL before any components mount
import '../src/i18n';

import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/constants/theme';
import { ErrorBoundary } from '../src/components';
import { AuthProvider } from '../src/auth/AuthContext';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primary + '20',
    secondary: colors.secondary,
    secondaryContainer: colors.secondary + '20',
    error: colors.error,
    errorContainer: colors.error + '20',
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.background,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
  },
  roundness: 12,
};

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <PaperProvider theme={theme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </PaperProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
