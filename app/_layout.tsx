import '../global.css';
import { localeReady } from '../src/i18n';

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../src/components';
import { AuthProvider } from '../src/auth/AuthContext';
import { ThemeProvider, useThemeContext } from '../src/theme';

function AppContent() {
  const { isDark } = useThemeContext();

  return (
    <View className={isDark ? "dark flex-1 bg-background" : "flex-1 bg-background"}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [localeLoaded, setLocaleLoaded] = useState(false);

  useEffect(() => {
    localeReady.finally(() => setLocaleLoaded(true));
  }, []);

  if (!localeLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
