import { Tabs, useRouter } from 'expo-router';
import { I18nManager, View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useThemeContext } from '../../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../../src/i18n';
import { useAuth } from '../../src/auth/useAuth';

const isRTL = I18nManager.isRTL;

export default function TabLayout() {
  const router = useRouter();
  const { isDark } = useThemeContext();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const primary = '#3b82f6';
  const inactive = isDark ? '#94a3b8' : '#64748b';
  const surface = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e2e8f0';

  const tabs = [
    { name: 'employees', title: t('tabs.employees'), icon: 'account-group' as const },
    { name: 'attendance', title: t('tabs.attendance'), icon: 'calendar-check' as const },
    { name: 'wages', title: t('tabs.wages'), icon: 'cash-multiple' as const },
    { name: 'profile', title: t('tabs.profile'), icon: 'account-circle' as const },
  ];

  const orderedTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: inactive,
        headerStyle: { backgroundColor: primary },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          paddingBottom: 6,
          paddingTop: 6,
          height: 65,
          backgroundColor: surface,
          borderTopColor: border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      {orderedTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
