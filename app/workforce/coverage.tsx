import { normalizeDigits } from '../../src/utils/numberUtils';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/useAuth';
import { useEmployees } from '../../src/hooks/useEmployees';
import { Button } from '../../src/components/ui/button';
import { Text } from '../../src/components/ui/text';
import { FormInput } from '../../src/components/forms/FormInput';
import { t } from '../../src/i18n';
import { EmployeeStatus } from '../../src/models';
import { getTodayString } from '../../src/utils/dateUtils';
import {
  getOffers,
  decideOffer,
  recordInterest,
  openShift,
} from '../../src/workforce/coverage';

type Form = {
  date: string;
  start: string;
  end: string;
  role: string;
  location: string;
};
const blank = (): Form => ({
  date: getTodayString(),
  start: '09:00',
  end: '17:00',
  role: '',
  location: '',
});
export default function Coverage() {
  const { user } = useAuth();
  return user ? <CoverageList key={user.id} owner={user.id} /> : null;
}
function CoverageList({ owner }: { owner: number }) {
  const { employees } = useEmployees(EmployeeStatus.ACTIVE);
  const [archived, setArchived] = useState(false),
    [version, bump] = useState(0),
    [form, setForm] = useState<Form>(),
    [picker, setPicker] = useState('');
  const requestKey = `${archived}/${version}`;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    rows?: Awaited<ReturnType<typeof getOffers>>;
    failed?: boolean;
  }>();
  const result = snapshot?.key === requestKey ? snapshot.rows : undefined;
  const failed = snapshot?.key === requestKey && snapshot.failed;
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setSnapshot({ key: requestKey });
      getOffers(owner, archived)
        .then((rows) => {
          if (active) setSnapshot({ key: requestKey, rows });
        })
        .catch(() => {
          if (active) setSnapshot({ key: requestKey, failed: true });
        });
      return () => {
        active = false;
      };
    }, [owner, archived, requestKey])
  );
  const act = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
      setForm(undefined);
      setPicker('');
      bump((v) => v + 1);
    } catch (e) {
      const key = String(e).match(/(?:coverage|schedule)\.[A-Za-z]+/);
      Alert.alert(t('common.error'), t(key?.[0] ?? 'work.saveError'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-background"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="p-4 gap-3"
    >
      <View className="flex-row flex-wrap gap-2">
        <Button
          variant={archived ? 'outline' : 'default'}
          onPress={() => {
            setArchived(false);
            setPicker('');
          }}
        >
          {t('coverage.open')}
        </Button>
        <Button
          variant={archived ? 'default' : 'outline'}
          onPress={() => {
            setArchived(true);
            setForm(undefined);
            setPicker('');
          }}
        >
          {t('coverage.archived')}
        </Button>
      </View>
      {!archived && !form && (
        <Button variant="outline" onPress={() => setForm(blank())}>
          {t('coverage.add')}
        </Button>
      )}
      {form && (
        <View className="rounded-xl border border-border bg-card p-4">
          {(
            [
              ['role', 'role'],
              ['date', 'day'],
              ['start', 'starts'],
              ['end', 'ends'],
              ['location', 'location'],
            ] as const
          ).map(([field, key]) => (
            <FormInput
              key={field}
              label={t('schedule.' + key)}
              value={form[field]}
              onChangeText={(v) =>
                setForm({
                  ...form,
                  [field]: field === 'date' ? normalizeDigits(v) : v,
                })
              }
            />
          ))}
          <View className="flex-row gap-2">
            <Button
              disabled={busy}
              onPress={() =>
                act(() =>
                  openShift(
                    owner,
                    form.date,
                    form.start,
                    form.end,
                    form.role,
                    form.location
                  )
                )
              }
            >
              {t('common.save')}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() => setForm(undefined)}
            >
              {t('common.cancel')}
            </Button>
          </View>
        </View>
      )}
      {failed ? (
        <Button variant="outline" onPress={() => bump((v) => v + 1)}>
          {t('common.retry')}
        </Button>
      ) : !result ? (
        <ActivityIndicator />
      ) : result.length === 0 ? (
        <Text variant="muted">{t('coverage.none')}</Text>
      ) : (
        result.map((offer) => (
          <View
            key={offer.id}
            className="rounded-xl border border-border bg-card p-4 gap-3"
          >
            <Text className="font-semibold text-foreground">
              {offer.role}
              {offer.location ? ' · ' + offer.location : ''}
            </Text>
            <Text>
              {offer.start_at.replace('T', ' ')} –{' '}
              {offer.end_at.replace('T', ' ')}
            </Text>
            {archived ? (
              <Text variant="muted">
                {t('coverage.' + offer.status)} {offer.assigned_name ?? ''}
              </Text>
            ) : (
              <>
                {offer.bids.map((b) => (
                  <View
                    key={b.employee_id}
                    className="flex-row items-center justify-between"
                  >
                    <Text>{b.name}</Text>
                    <Button
                      disabled={busy}
                      size="sm"
                      onPress={() =>
                        act(() => decideOffer(owner, offer.id, b.employee_id))
                      }
                    >
                      {t('coverage.assign')}
                    </Button>
                  </View>
                ))}
                {!offer.bids.length && (
                  <Text variant="muted">{t('coverage.noBids')}</Text>
                )}
                <View className="flex-row flex-wrap gap-2">
                  <Button
                    disabled={busy}
                    variant="outline"
                    onPress={() =>
                      setPicker((p) => (p === offer.id ? '' : offer.id))
                    }
                  >
                    {t('coverage.interested')}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(t('coverage.cancelConfirm'), undefined, [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.confirm'),
                          onPress: () =>
                            void act(() => decideOffer(owner, offer.id)),
                        },
                      ])
                    }
                  >
                    {t('coverage.cancel')}
                  </Button>
                </View>
                {picker === offer.id && (
                  <View className="gap-2">
                    <Text>{t('coverage.choose')}</Text>
                    {employees
                      .filter(
                        (e) => !offer.bids.some((b) => b.employee_id === e.id)
                      )
                      .map((e) => (
                        <Button
                          key={e.id}
                          disabled={busy}
                          variant="outline"
                          onPress={() =>
                            act(() => recordInterest(owner, offer.id, e.id))
                          }
                        >
                          {e.name}
                        </Button>
                      ))}
                  </View>
                )}
              </>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
