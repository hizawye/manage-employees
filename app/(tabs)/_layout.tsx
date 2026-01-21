import { Tabs } from 'expo-router';
import { I18nManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { t } from '../../src/i18n';

const isRTL = I18nManager.isRTL;

export default function TabLayout() {
  const theme = useTheme();

  // For RTL, we reverse the tab order so Profile appears on the right
  const tabs = [
    {
      name: 'employees',
      title: t('tabs.employees'),
      icon: 'account-group' as const,
    },
    {
      name: 'attendance',
      title: t('tabs.attendance'),
      icon: 'calendar-check' as const,
    },
    {
      name: 'wages',
      title: t('tabs.wages'),
      icon: 'cash-multiple' as const,
    },
    {
      name: 'profile',
      title: t('tabs.profile'),
      icon: 'account-circle' as const,
    },
  ];

  // Reverse tabs for RTL so the visual order is correct
  const orderedTabs = isRTL ? [...tabs].reverse() : tabs;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          paddingBottom: 6,
          paddingTop: 6,
          height: 65,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
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
