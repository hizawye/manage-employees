import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../ui/text';
import { Button } from '../ui/button';
import { FormInput } from '../forms/FormInput';
import { t } from '../../i18n';
import { formatDate } from '../../utils/dateUtils';
import {
  applyShiftTemplate,
  deleteShiftTemplate,
  listShiftTemplates,
  saveShiftTemplate,
  type ShiftTemplate,
} from '../../services/WorkShiftService';
import { shiftError } from './ShiftEditor';

interface Props {
  owner: number;
  week: string;
  dismiss: () => void;
  applied: (count: number) => void;
}

export function ShiftTemplates({ owner, week, dismiss, applied }: Props) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>();
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    try {
      setTemplates(await listShiftTemplates(owner));
    } catch {
      setFeedback(t('schedule.loadError'));
    }
  }, [owner]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback('');
    try {
      await operation();
    } catch (error) {
      setFeedback(shiftError(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      await saveShiftTemplate(owner, week, name);
      setName('');
      setFeedback(t('schedule.templateSaved'));
      await load();
    });
  const confirmApply = (template: ShiftTemplate) =>
    Alert.alert(t('schedule.useTemplate', { name: template.name }), t('schedule.copyBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('schedule.apply'),
        onPress: () => void run(async () => applied(await applyShiftTemplate(owner, week, template.id))),
      },
    ]);
  const remove = (template: ShiftTemplate) =>
    Alert.alert(t('schedule.deleteTemplate'), t('schedule.confirmDeleteTemplate', { name: template.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          void run(async () => {
            await deleteShiftTemplate(owner, template.id);
            await load();
          }),
      },
    ]);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!lock.current) dismiss();
      }}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-5 pb-12 gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text variant="h3">{t('schedule.templates')}</Text>
              <Text variant="muted">{formatDate(week)}</Text>
            </View>
            <Button variant="ghost" disabled={busy} onPress={dismiss}>
              {t('common.goBack')}
            </Button>
          </View>
          <View className="rounded-xl border border-border bg-card p-3">
            <FormInput
              label={t('schedule.templateName')}
              value={name}
              onChangeText={setName}
              maxLength={80}
            />
            <Button disabled={busy || !name.trim()} onPress={save}>
              {t('schedule.saveTemplate')}
            </Button>
          </View>
          {!!feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
          {!templates &&
            (feedback ? (
              <Button variant="outline" onPress={load}>
                {t('common.retry')}
              </Button>
            ) : (
              <ActivityIndicator />
            ))}
          {templates?.length === 0 && <Text variant="muted">{t('schedule.noTemplates')}</Text>}
          {templates?.map((template) => (
            <View key={template.id} className="rounded-xl bg-card border border-border p-3 gap-2">
              <Text variant="large">{template.name}</Text>
              <Text variant="muted">{t('schedule.templateCount', { count: template.count })}</Text>
              <View className="flex-row gap-2">
                <Button variant="outline" disabled={busy} onPress={() => confirmApply(template)}>
                  {t('schedule.apply')}
                </Button>
                <Button variant="ghost" disabled={busy} onPress={() => remove(template)}>
                  <Text className="text-destructive">{t('schedule.deleteTemplate')}</Text>
                </Button>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
