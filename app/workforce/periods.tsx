import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { addMonths, format, parseISO } from 'date-fns';
import { useAuth } from '../../src/auth/useAuth';
import { Text } from '../../src/components/ui/text';
import { Button } from '../../src/components/ui/button';
import { getLocale, t } from '../../src/i18n';
import {
  closePayPeriod,
  getPayPeriodReview,
  reopenPayPeriod,
  type PeriodReview,
} from '../../src/services/PayPeriodService';
import { formatCurrency, formatDate } from '../../src/utils/dateUtils';

export default function PayPeriodsScreen() {
  const { user } = useAuth();
  return user ? <Periods key={user.id} owner={user.id} /> : null;
}
function Periods({ owner }: { owner: number }) {
  const router = useRouter();
  const [month, setMonth] = useState(() => format(addMonths(new Date(), -1), 'yyyy-MM'));
  const [view, setView] = useState<PeriodReview>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const writeLock = useRef(false);
  const version = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setError(false);
    try {
      const result = await getPayPeriodReview(owner, month);
      if (request === version.current) setView(result);
    } catch {
      if (request === version.current) {
        setView(undefined);
        setError(true);
      }
    }
  }, [owner, month]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        version.current++;
      };
    }, [load])
  );
  const changeMonth = (step: number) =>
    setMonth(format(addMonths(parseISO(month + '-01'), step), 'yyyy-MM'));
  const current = view?.month === month ? view : undefined;
  const thisMonth = format(new Date(), 'yyyy-MM');
  const action = async () => {
    if (!current || writeLock.current) return;
    writeLock.current = true;
    setBusy(true);
    try {
      if (current.period) await reopenPayPeriod(owner, month, current.period.id);
      else await closePayPeriod(owner, current, current.issues.length > 0);
    } catch (cause) {
      const key =
        cause instanceof Error && /^periods\.\w+$/.test(cause.message)
          ? cause.message
          : 'periods.failed';
      Alert.alert(t('common.error'), t(key));
    } finally {
      await load();
      setBusy(false);
      writeLock.current = false;
    }
  };
  const confirm = () => {
    if (!current) return;
    const closed = !!current.period;
    const message = closed
      ? t('periods.reopenMessage')
      : [
          t('periods.closeMessage'),
          current.issues.length ? t('periods.exceptions', { count: current.issues.length }) : '',
        ]
          .filter(Boolean)
          .join('\n\n');
    Alert.alert(t(closed ? 'periods.reopenTitle' : 'periods.closeTitle'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t(closed ? 'periods.reopen' : 'periods.close'), onPress: () => void action() },
    ]);
  };
  const blocked = current?.issues.some((issue) => issue.reason === 'openPunch');
  return (
    <View className="flex-1 bg-background">
      <View className="bg-card px-2 py-2 border-b border-border flex-row items-center justify-between">
        <Pressable
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('periods.previous')}
          className="p-3"
          onPress={() => changeMonth(-1)}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'chevron-right' : 'chevron-left'}
            size={22}
            className="text-foreground"
          />
        </Pressable>
        <Text variant="large">
          {parseISO(month + '-01').toLocaleDateString(getLocale(), {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Pressable
          disabled={busy || month >= thisMonth}
          accessibilityRole="button"
          accessibilityLabel={t('periods.next')}
          className="p-3"
          onPress={() => changeMonth(1)}
        >
          <MaterialCommunityIcons
            name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
            size={22}
            className={month >= thisMonth ? 'text-muted-foreground' : 'text-foreground'}
          />
        </Pressable>
      </View>
      {error ? (
        <View className="p-4 gap-3">
          <Text>{t('periods.load')}</Text>
          <Button onPress={load}>{t('common.retry')}</Button>
        </View>
      ) : !current ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-4 pb-12">
          <View className="bg-card border border-border rounded-xl p-4 gap-1">
            <Text variant="muted">{t('periods.total')}</Text>
            <Text variant="h2">
              {formatCurrency(
                current.employees.reduce((sum, e) => sum + Math.round(e.earned * 100), 0) / 100
              )}
            </Text>
            <Text variant="small">
              {current.period
                ? t('periods.closedOn', { date: formatDate(current.period.closed_at) })
                : t('periods.open')}
            </Text>
            {!!current.period?.reviewed_exceptions && (
              <Text variant="muted">
                {t('periods.accepted', { count: current.period.reviewed_exceptions })}
              </Text>
            )}
          </View>
          {current.employees.map((e) => (
            <Pressable
              className="bg-card border border-border rounded-xl p-4"
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={t('periods.viewPay', { name: e.name })}
              onPress={() =>
                router.push({
                  pathname: '/wages/[employeeId]',
                  params: { employeeId: e.id, month },
                })
              }
            >
              <View className="flex-row gap-3 items-center justify-between">
                <Text variant="large" className="flex-1">
                  {e.name}
                </Text>
                <Text variant="small">{formatCurrency(e.earned)}</Text>
                <MaterialCommunityIcons
                  name={I18nManager.isRTL ? 'chevron-left' : 'chevron-right'}
                  size={18}
                  className="text-muted-foreground"
                />
              </View>
              <Text variant="muted">
                {t('periods.records')} · {e.days}　{t('periods.hours')} ·{' '}
                {e.hours.toLocaleString(getLocale(), { maximumFractionDigits: 2 })}
              </Text>
            </Pressable>
          ))}
          {!current.employees.length && <Text variant="muted">{t('periods.empty')}</Text>}
          {!current.period && (
            <View className="gap-2">
              <Text variant="large">{t('periods.review')}</Text>
              {!current.issues.length && <Text variant="muted">{t('periods.noIssues')}</Text>}
              {current.issues.map((i) => (
                <View
                  key={`${i.employeeId}/${i.date}/${i.reason}`}
                  className="border-b border-border pb-2"
                >
                  <Text>
                    {i.employeeName} · {formatDate(i.date)}
                  </Text>
                  <Text variant="muted">{t('periods.' + i.reason)}</Text>
                </View>
              ))}
            </View>
          )}
          {!current.period && (month >= thisMonth || blocked) && (
            <Text>{t(month >= thisMonth ? 'periods.future' : 'periods.unfinished')}</Text>
          )}
          <Button
            disabled={busy || (!current.period && (month >= thisMonth || blocked))}
            isLoading={busy}
            variant={current.period ? 'outline' : 'default'}
            onPress={confirm}
          >
            {t(current.period ? 'periods.reopen' : 'periods.close')}
          </Button>
        </ScrollView>
      )}
    </View>
  );
}
