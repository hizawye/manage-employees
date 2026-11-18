import { Redirect, Stack, useRouter } from 'expo-router';
import { ActivityIndicator, I18nManager, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { t } from '../../src/i18n';

export default function WorkforceLayout() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  if (isLoading) return <ActivityIndicator />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <Stack
      key={user.id}
      screenOptions={{
        headerStyle: { backgroundColor: '#2563eb' },
        headerTintColor: '#ffffff',
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
            hitSlop={10}
            className="p-2"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace('/(tabs)/work')
            }
          >
            <MaterialCommunityIcons
              name={I18nManager.isRTL ? 'arrow-right' : 'arrow-left'}
              size={24}
              color="white"
            />
          </Pressable>
        ),
      }}
    >
      {(
        [
          'schedule',
          'clock',
          'leave',
          'reports',
          'coverage',
          'periods',
          'import',
        ] as const
      ).map((route) => (
        <Stack.Screen
          key={route}
          name={route}
          options={{
            title: t(`work.${route === 'import' ? 'rosterImport' : route}`),
          }}
        />
      ))}
    </Stack>
  );
}
