import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { FormInput } from '../forms/FormInput';
import { getLocale, t } from '../../i18n';
import { Employee } from '../../models';
import { formatDate, getTodayString } from '../../utils/dateUtils';
import { filterEmployees } from '../../utils/employeeDirectory';
import {
  deleteUnavailable,
  listUnavailable,
  saveUnavailable,
  wallTime,
  type AvailabilityInput,
  type AvailabilityRule,
} from '../../services/AvailabilityService';
import { shiftError } from './ShiftEditor';

const weekdays = [1, 2, 3, 4, 5, 6, 0];
function weekdayLabel(day: number) {
  return new Intl.DateTimeFormat(getLocale(), { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, 7 + day))
  );
}
function defaultForm(staff: Employee[]): AvailabilityInput {
  return {
    employeeId: staff.length === 1 ? staff[0].id : '',
    weekday: new Date().getDay(),
    allDay: true,
    start: '09:00',
    end: '17:00',
    effective: getTodayString(),
  };
}

export function Availability({
  owner,
  staff,
  dismiss,
}: {
  owner: number;
  staff: Employee[];
  dismiss: () => void;
}) {
  const [rules, setRules] = useState<AvailabilityRule[]>();
  const [form, setForm] = useState<AvailabilityInput>();
  const [editing, setEditing] = useState<string>();
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const reload = useCallback(async () => {
    try {
      setRules(await listUnavailable(owner));
    } catch {
      setFeedback(t('schedule.loadError'));
    }
  }, [owner]);
  useEffect(() => {
    void reload();
  }, [reload]);
  function open(rule?: AvailabilityRule) {
    const draft = rule
      ? {
          employeeId: rule.employeeId,
          effective: rule.effective,
          weekday: rule.weekday,
          start: wallTime(rule.start),
          end: wallTime(rule.start + rule.duration),
          allDay: rule.duration === 1440,
        }
      : defaultForm(staff);
    setEditing(rule?.id);
    setForm(draft);
    setChoosing(!draft.employeeId);
    setSearch('');
    setFeedback('');
  }
  function back() {
    if (lock.current) return;
    if (form) {
      setForm(undefined);
      setFeedback('');
    } else dismiss();
  }
  async function write(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback('');
    try {
      await action();
      setForm(undefined);
      await reload();
    } catch (e) {
      setFeedback(shiftError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function remove(rule: AvailabilityRule) {
    Alert.alert(t('schedule.deleteRule'), t('schedule.removeRule', { name: rule.employeeName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => void write(() => deleteUnavailable(owner, rule.id)),
      },
    ]);
  }
  return (
    <Modal visible animationType="slide" onRequestClose={back}>
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-5 pb-12 gap-4">
          <View className="flex-row items-center justify-between">
            <Text variant="h3" className="flex-1">
              {t('schedule.availability')}
            </Text>
            <Button variant="ghost" onPress={back} disabled={busy}>
              {t('common.goBack')}
            </Button>
          </View>
          {!!feedback && (
            <Text accessibilityLiveRegion="polite" className="text-destructive">
              {feedback}
            </Text>
          )}
          {form ? (
            <>
              <Text variant="label">{t('schedule.employee')}</Text>
              {choosing ? (
                <View className="gap-2">
                  <FormInput
                    label={t('employee.searchPlaceholder')}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {filterEmployees(staff, search)
                    .slice(0, 20)
                    .map((person) => (
                      <Button
                        key={person.id}
                        variant="outline"
                        onPress={() => {
                          setForm({ ...form, employeeId: person.id });
                          setChoosing(false);
                        }}
                      >
                        {person.name}
                      </Button>
                    ))}
                </View>
              ) : (
                <Button variant="outline" onPress={() => setChoosing(true)}>
                  {staff.find((person) => person.id === form.employeeId)?.name ??
                    rules?.find((rule) => rule.id === editing)?.employeeName ??
                    t('schedule.selectEmployee')}
                </Button>
              )}
              <Text variant="label">{t('schedule.everyWeek')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {weekdays.map((day) => (
                  <Button
                    key={day}
                    size="sm"
                    variant={form.weekday === day ? 'default' : 'outline'}
                    accessibilityState={{ selected: form.weekday === day }}
                    onPress={() => setForm({ ...form, weekday: day })}
                  >
                    {weekdayLabel(day)}
                  </Button>
                ))}
              </View>
              <View className="flex-row items-center justify-between">
                <Text>{t('schedule.allDay')}</Text>
                <Switch
                  accessibilityLabel={t('schedule.allDay')}
                  value={form.allDay}
                  onValueChange={(allDay) => setForm({ ...form, allDay })}
                />
              </View>
              {!form.allDay && (
                <View className="flex-row gap-3">
                  <FormInput
                    label={t('schedule.starts')}
                    value={form.start}
                    className="flex-1"
                    onChangeText={(start) => setForm({ ...form, start })}
                  />
                  <FormInput
                    label={t('schedule.ends')}
                    value={form.end}
                    className="flex-1"
                    onChangeText={(end) => setForm({ ...form, end })}
                  />
                </View>
              )}
              <FormInput
                label={t('schedule.effective')}
                value={form.effective}
                onChangeText={(value) =>
                  setForm({
                    ...form,
                    effective: value.replace(/[٠-٩۰-۹]/g, (n) => String(n.charCodeAt(0) & 15)),
                  })
                }
                placeholder="YYYY-MM-DD"
              />
              <Button
                isLoading={busy}
                onPress={() => void write(() => saveUnavailable(owner, form, editing))}
              >
                {t('common.save')}
              </Button>
            </>
          ) : (
            <>
              <Button disabled={staff.length === 0 || busy} onPress={() => open()}>
                {t('schedule.addRule')}
              </Button>
              {rules?.length === 0 && <Text variant="muted">{t('schedule.noRules')}</Text>}
              {!rules &&
                (feedback ? (
                  <Button variant="outline" onPress={reload}>
                    {t('common.retry')}
                  </Button>
                ) : (
                  <ActivityIndicator />
                ))}
              {rules?.map((rule) => (
                <View key={rule.id} className="border border-border rounded-xl bg-card p-4 gap-1">
                  <Text variant="large">{rule.employeeName}</Text>
                  <Text>
                    {weekdayLabel(rule.weekday)} ·{' '}
                    {rule.duration === 1440
                      ? t('schedule.allDay')
                      : wallTime(rule.start) +
                        ' – ' +
                        wallTime(rule.start + rule.duration) +
                        (rule.start + rule.duration > 1440 ? ' · ' + t('schedule.nextDay') : '')}
                  </Text>
                  <Text variant="muted">
                    {t('schedule.effective')} · {formatDate(rule.effective)}
                  </Text>
                  <View className="flex-row gap-2">
                    <Button variant="outline" disabled={busy} onPress={() => open(rule)}>
                      {t('common.edit')}
                    </Button>
                    <Button variant="ghost" disabled={busy} onPress={() => remove(rule)}>
                      <Text className="text-destructive">{t('common.delete')}</Text>
                    </Button>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
