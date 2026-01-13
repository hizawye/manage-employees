import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../src/constants/theme';
import { t } from '../../src/i18n';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarStyle: { paddingBottom: 4, height: 60 },
      }}
    >
      <Tabs.Screen
        name="employees"
        options={{
          title: t('tabs.employees'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: t('tabs.attendance'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wages"
        options={{
          title: t('tabs.wages'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="currency-usd" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
