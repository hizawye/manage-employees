import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth/useAuth';

export default function AuthLayout() {
  const router = useRouter();
  const { user, isLoading, isGuest } = useAuth();

  useEffect(() => {
    if (!isLoading && user && !isGuest) {
      router.replace('/(tabs)/employees');
    }
  }, [isLoading, user, isGuest, router]);

  if (isLoading || (user && !isGuest)) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="convert-guest" />
    </Stack>
  );
}
