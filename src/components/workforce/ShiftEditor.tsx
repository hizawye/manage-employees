import React, { useRef, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../ui/button';
import { Text } from '../ui/text';
import { FormInput } from '../forms/FormInput';
import { eligibleStaff } from '../../services/AvailabilityService';
import { Employee } from '../../models';
import { t } from '../../i18n';
import { formatDate } from '../../utils/dateUtils';
import { filterEmployees } from '../../utils/employeeDirectory';
import {
  WorkShift,
  ShiftDraft,
  deleteWorkShift,
  normalizeShiftTime,
  saveWorkShift,
} from '../../services/WorkShiftService';

export function shiftError(error: unknown) {
  const reason = String(error).match(
    /schedule\.(invalidDate|invalidTime|selectEmployee|sameTime|inactive|overlap|onLeave|missing|templateNameError|templateDuplicate|templateEmpty|templateMissing|unavailable|booked|duplicateRule|missingRule)\b/
  );
  return t(reason?.[0] ?? 'schedule.failed');
}

function dateDigits(text: string) {
  return text
    .replace(/[٠-٩]/g, (n) => String(n.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (n) => String(n.charCodeAt(0) - 1776));
}

function overnight(start: string, end: string) {
  try {
    return normalizeShiftTime(end) < normalizeShiftTime(start);
  } catch {
    return false;
  }
}

interface Props {
  owner: number;
  staff: Employee[];
  date: string;
  shift?: WorkShift;
  onClose: () => void;
  onSaved: () => void;
}

export function ShiftEditor({ owner, staff, date, shift, onClose, onSaved }: Props) {
  const single = staff.length === 1 ? staff[0] : undefined;
  const [draft, setDraft] = useState<ShiftDraft>({
    date: shift?.startAt.slice(0, 10) ?? date,
    startTime: shift?.startAt.slice(11) ?? '09:00',
    endTime: shift?.endAt.slice(11) ?? '17:00',
    employeeId: shift?.employeeId ?? single?.id ?? '',
    role: shift?.role ?? single?.role ?? '',
    location: shift?.location ?? '',
    notes: shift?.notes ?? '',
  });
  const [search, setSearch] = useState('');
  const [choosing, setChoosing] = useState(!draft.employeeId);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [eligible, setEligible] = useState<{ slot: string; ids: string[] }>();
  const slot = JSON.stringify([draft.date, draft.startTime, draft.endTime]);
  const filter = eligible?.slot === slot ? eligible.ids : undefined;
  const matches = filterEmployees(
    filter ? staff.filter((person) => filter.includes(person.id)) : staff,
    search
  );
  const findAvailable = async () => {
    setError('');
    try {
      const ids = await eligibleStaff(
        owner,
        dateDigits(draft.date.trim()),
        draft.startTime,
        draft.endTime,
        shift?.id
      );
      setEligible({ slot, ids });
      setSearch('');
      setChoosing(true);
    } catch (cause) {
      setError(shiftError(cause));
    }
  };
  const selectedName = staff.find((person) => person.id === draft.employeeId)?.name ?? shift?.employeeName;
  const update = (field: keyof ShiftDraft, value: string) =>
    setDraft((previous) => ({ ...previous, [field]: value }));

  const apply = async (remove: boolean) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (remove && shift) await deleteWorkShift(owner, shift.id);
      else await saveWorkShift(owner, { ...draft, date: dateDigits(draft.date.trim()) }, shift?.id);
      onSaved();
    } catch (cause) {
      setError(shiftError(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const confirmRemove = () => {
    if (!shift) return;
    Alert.alert(
      t('schedule.remove'),
      t('schedule.confirmRemove', {
        name: shift.employeeName,
        date: formatDate(shift.startAt.slice(0, 10)),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => void apply(true) },
      ]
    );
  };

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-5 pb-12">
          <View className="flex-row items-center justify-between mb-5">
            <Text variant="h3" className="flex-1">
              {t(shift ? 'schedule.edit' : 'schedule.add')}
            </Text>
            <Button variant="ghost" onPress={onClose} disabled={busy}>
              {t('common.cancel')}
            </Button>
          </View>
          <View className="mb-4 gap-2">
            <Text variant="label">{t('schedule.employee')}</Text>
            {!choosing ? (
              <Button
                variant="outline"
                onPress={() => {
                  setEligible(undefined);
                  setChoosing(true);
                }}
              >
                {selectedName ?? t('schedule.selectEmployee')}
              </Button>
            ) : (
              <>
                <FormInput
                  label={t('employee.searchPlaceholder')}
                  value={search}
                  onChangeText={setSearch}
                  className="mb-0"
                />
                {matches.slice(0, 20).map((person) => (
                  <Button
                    key={person.id}
                    variant={draft.employeeId === person.id ? 'secondary' : 'outline'}
                    onPress={() => {
                      setDraft((previous) => ({ ...previous, employeeId: person.id, role: person.role }));
                      setChoosing(false);
                      setSearch('');
                    }}
                  >
                    {person.name}
                  </Button>
                ))}
                {matches.length === 0 && (
                  <Text variant="muted">
                    {t(filter?.length === 0 ? 'schedule.eligibleEmpty' : 'employee.noMatches')}
                  </Text>
                )}
              </>
            )}
          </View>
          <FormInput
            label={t('schedule.day')}
            value={draft.date}
            onChangeText={(v) => update('date', v)}
            placeholder="YYYY-MM-DD"
          />
          <View className="flex-row gap-3">
            <FormInput
              label={t('schedule.starts')}
              className="flex-1"
              value={draft.startTime}
              onChangeText={(v) => update('startTime', v)}
              placeholder="09:00"
            />
            <FormInput
              label={t('schedule.ends')}
              className="flex-1"
              value={draft.endTime}
              onChangeText={(v) => update('endTime', v)}
              placeholder="17:00"
            />
          </View>
          <Button variant="outline" className="mb-3" onPress={findAvailable}>
            {t('schedule.findAvailable')}
          </Button>
          {overnight(draft.startTime, draft.endTime) && (
            <Text variant="muted" className="mb-3">
              {t('schedule.overnight')}
            </Text>
          )}
          <FormInput label={t('schedule.role')} value={draft.role} onChangeText={(v) => update('role', v)} />
          <FormInput
            label={t('schedule.location')}
            value={draft.location}
            onChangeText={(v) => update('location', v)}
          />
          <FormInput
            label={t('schedule.notes')}
            value={draft.notes}
            onChangeText={(v) => update('notes', v)}
            multiline
          />
          {!!error && (
            <Text accessibilityLiveRegion="polite" className="text-destructive mb-3">
              {error}
            </Text>
          )}
          <Button onPress={() => void apply(false)} isLoading={busy}>
            {t('common.save')}
          </Button>
          {shift && (
            <Button variant="ghost" onPress={confirmRemove} disabled={busy} className="mt-3">
              <Text className="text-destructive">{t('schedule.remove')}</Text>
            </Button>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
