import { Pressable, ScrollView, View } from 'react-native';
import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../src/auth/useAuth';
import { getWorkOverview } from '../../src/workforce/overview';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../../src/components/ui/text';
import { t } from '../../src/i18n';

const tools = [
  ['schedule', 'schedule', 'calendar-week'],
  ['clock', 'clock', 'timer-outline'],
  ['leave', 'leave', 'palm-tree'],
  ['reports', 'reports', 'file-chart-outline'],
  ['coverage', 'coverage', 'account-switch-outline'],
  ['periods', 'periods', 'calendar-lock-outline'],
  ['import', 'rosterImport', 'account-multiple-plus-outline'],
] as const;

export default function WorkScreen() {
  const router = useRouter();
  const owner = useAuth().user?.id;
  const [overview, setOverview] = useState<{
    owner: number;
    data: Awaited<ReturnType<typeof getWorkOverview>>;
  }>();
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const refresh = () => {
        const now = new Date();
        if (owner !== undefined)
          getWorkOverview(
            owner,
            format(now, 'yyyy-MM-dd'),
            format(now, "yyyy-MM-dd'T'HH:mm")
          )
            .then((data) => {
              if (active) setOverview({ owner, data });
            })
            .catch(() => {
              if (active) setOverview(undefined);
            });
      };
      refresh();
      const timer = setInterval(refresh, 60000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [owner])
  );
  const counts = overview?.owner === owner ? overview?.data : undefined;
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-3"
    >
      {counts && (
        <View className="rounded-xl border border-border bg-card p-4 gap-3">
          <Text className="text-lg font-semibold text-foreground">
            {t('work.today')}
          </Text>
          <View className="flex-row gap-2">
            {(
              [
                ['shifts', 'planned', 'schedule'],
                ['clocked', 'clocked', 'clock'],
                ['pending', 'pending', 'leave'],
              ] as const
            ).map(([key, label, route]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                className="flex-1"
                onPress={() => router.push(`/workforce/${route}`)}
              >
                <Text className="text-2xl font-bold text-foreground">
                  {counts[key]}
                </Text>
                <Text variant="muted">{t('work.' + label)}</Text>
              </Pressable>
            ))}
          </View>
          {counts.unchecked > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/attendance')}
              className="min-h-11 justify-center border-t border-border"
            >
              <Text className="text-primary">
                {t('work.unchecked')} · {counts.unchecked}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {tools.map(([route, key, icon]) => (
        <Pressable
          key={route}
          accessibilityRole="button"
          onPress={() => router.push(`/workforce/${route}`)}
          className="flex-row items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 active:opacity-75"
        >
          <MaterialCommunityIcons name={icon} size={26} color="#3b82f6" />
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-foreground">
              {t('work.' + key)}
            </Text>
            <Text variant="muted">{t('work.' + key + 'Hint')}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
