import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/useAuth';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/(tabs)/employees');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <View className="flex-1 justify-center items-center bg-background">
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
