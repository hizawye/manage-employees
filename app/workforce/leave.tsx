import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/auth/useAuth';
import { Button } from '../../src/components/ui/button';
import { Text } from '../../src/components/ui/text';
import { FormInput } from '../../src/components/forms/FormInput';
import { useEmployees } from '../../src/hooks/useEmployees';
import { t } from '../../src/i18n';
import { EmployeeStatus } from '../../src/models/Employee';
import { formatDate, getTodayString } from '../../src/utils/dateUtils';
import { filterEmployees } from '../../src/utils/employeeDirectory';
import { isPayrollDate } from '../../src/utils/payrollDate';
import {
  decideTimeOff,
  leaveStatuses,
  leaveTypes,
  listTimeOff,
  requestTimeOff,
  timeOffError,
  type LeaveDecision,
  type LeaveStatus,
  type LeaveType,
  type TimeOffRequest,
} from '../../src/services/TimeOffService';

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-11 justify-center px-3 rounded-lg border ${selected ? 'border-primary bg-secondary' : 'border-border bg-card'}`}
    >
      <Text
        className={selected ? 'text-primary font-semibold' : 'text-foreground'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function dateInput(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) =>
    String(digit.charCodeAt(0) & 15)
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormInput
      label={label}
      value={value}
      onChangeText={(value) => onChange(dateInput(value))}
      placeholder="YYYY-MM-DD"
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={10}
    />
  );
}

function RequestForm({
  owner,
  onSave,
  onCancel,
}: {
  owner: number;
  onSave: () => void;
  onCancel: () => void;
}) {
  const {
    employees,
    loading,
    error: rosterError,
    refresh,
  } = useEmployees(EmployeeStatus.ACTIVE);
  const [query, setQuery] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [visibleEmployees, setVisibleEmployees] = useState(12);
  const [type, setType] = useState<LeaveType>('vacation');
  const [startDate, setStart] = useState(getTodayString);
  const [endDate, setEnd] = useState(getTodayString);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const choices = useMemo(
    () => filterEmployees(employees, query),
    [employees, query]
  );
  const selected = employees.find((e) => e.id === employeeId);

  async function save() {
    if (pending.current) return;
    if (!selected) {
      setError('leave.employeeRequired');
      return;
    }
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      await requestTimeOff(owner, {
        employeeId,
        startDate,
        endDate,
        type,
        note,
      });
      onSave();
    } catch (e) {
      setError(timeOffError(e));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-3 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="h4">{t('leave.newRequest')}</Text>
      <FormInput
        label={t('leave.chooseEmployee')}
        value={selected ? selected.name : query}
        placeholder={t('leave.searchEmployee')}
        onChangeText={(value) => {
          setEmployeeId('');
          setQuery(value);
          setVisibleEmployees(12);
        }}
      />
      {loading ? (
        <ActivityIndicator />
      ) : rosterError ? (
        <Button variant="outline" onPress={refresh}>
          {t('common.retry')}
        </Button>
      ) : (
        !selected && (
          <View className="flex-row flex-wrap gap-2">
            {choices.slice(0, visibleEmployees).map((e) => (
              <Choice
                key={e.id}
                label={e.name}
                selected={false}
                onPress={() => {
                  setEmployeeId(e.id);
                  setQuery('');
                }}
              />
            ))}
            {choices.length > visibleEmployees && (
              <Button
                variant="ghost"
                onPress={() => setVisibleEmployees((count) => count + 12)}
              >
                {t('common.loadMore')}
              </Button>
            )}
            {!choices.length && (
              <Text variant="muted">
                {employees.length
                  ? t('employee.noMatches')
                  : t('leave.noEmployees')}
              </Text>
            )}
          </View>
        )
      )}
      <Text className="font-medium">{t('leave.typeLabel')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {leaveTypes.map((k) => (
          <Choice
            key={k}
            label={t('leave.type.' + k)}
            selected={type === k}
            onPress={() => setType(k)}
          />
        ))}
      </View>
      <DateField
        label={t('leave.start')}
        value={startDate}
        onChange={(value) => {
          if (
            endDate === startDate ||
            (isPayrollDate(value) && value > endDate)
          )
            setEnd(value);
          setStart(value);
        }}
      />
      <DateField label={t('leave.end')} value={endDate} onChange={setEnd} />
      <FormInput
        label={t('leave.note')}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
      />
      {!!error && (
        <Text accessibilityLiveRegion="polite" className="text-destructive">
          {t(error)}
        </Text>
      )}
      <Button isLoading={saving} onPress={save}>
        {t('leave.save')}
      </Button>
      <Button variant="ghost" disabled={saving} onPress={onCancel}>
        {t('common.cancel')}
      </Button>
    </ScrollView>
  );
}

export default function LeaveScreen() {
  const owner = useAuth().user?.id;
  return owner === undefined ? null : (
    <LeaveWorkspace key={owner} owner={owner} />
  );
}

function LeaveWorkspace({ owner }: { owner: number }) {
  const [items, setItems] = useState<TimeOffRequest[]>([]);
  const [status, setStatus] = useState<LeaveStatus | undefined>();
  const [type, setType] = useState<LeaveType | undefined>();
  const [from, setFrom] = useState('');
  const [through, setThrough] = useState('');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setReadError(false);
    try {
      const data = await listTimeOff(owner);
      if (current === generation.current) setItems(data);
    } catch {
      if (current === generation.current) setReadError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [owner]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load])
  );

  const invalidRange = !!(
    (from && !isPayrollDate(from)) ||
    (through && !isPayrollDate(through)) ||
    (from && through && from > through)
  );
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!status || item.status === status) &&
          (!type || item.type === type) &&
          (!from || item.endDate >= from) &&
          (!through || item.startDate <= through) &&
          item.employeeName
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase())
      ),
    [items, status, type, from, through, query]
  );
  const hasFilters = !!(status || type || from || through || query.trim());
  function clearFilters() {
    setStatus(undefined);
    setType(undefined);
    setFrom('');
    setThrough('');
    setQuery('');
  }
  async function decide(id: string, decision: LeaveDecision) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await decideTimeOff(owner, id, decision);
      setSelected('');
    } catch (e) {
      setError(timeOffError(e));
    } finally {
      await load();
      saving.current = false;
      setBusy(false);
    }
  }

  function cancel(id: string) {
    Alert.alert(t('leave.cancelTitle'), t('leave.cancelMessage'), [
      { text: t('leave.close'), style: 'cancel' },
      {
        text: t('leave.cancelRequest'),
        style: 'destructive',
        onPress: () => {
          void decide(id, 'cancelled');
        },
      },
    ]);
  }

  if (adding)
    return (
      <RequestForm
        owner={owner}
        onCancel={() => setAdding(false)}
        onSave={() => {
          clearFilters();
          setAdding(false);
          void load();
        }}
      />
    );

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-3 pb-12"
      keyboardShouldPersistTaps="handled"
      data={readError || invalidRange ? [] : filtered}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            <Button
              onPress={() => {
                setAdding(true);
                setError('');
              }}
            >
              {t('leave.newRequest')}
            </Button>
            <Button
              variant="outline"
              onPress={() => setFiltersOpen((value) => !value)}
            >
              {t('leave.filter')}
            </Button>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Choice
              selected={!status}
              label={t('leave.all')}
              onPress={() => setStatus(undefined)}
            />
            {leaveStatuses.map((k) => (
              <Choice
                key={k}
                selected={status === k}
                label={t('leave.status.' + k)}
                onPress={() => setStatus(k)}
              />
            ))}
          </View>
          {filtersOpen && (
            <View className="gap-2">
              <FormInput
                label={t('leave.search')}
                value={query}
                onChangeText={setQuery}
              />
              <View className="flex-row flex-wrap gap-2">
                <Choice
                  selected={!type}
                  label={t('leave.allTypes')}
                  onPress={() => setType(undefined)}
                />
                {leaveTypes.map((k) => (
                  <Choice
                    key={k}
                    selected={type === k}
                    label={t('leave.type.' + k)}
                    onPress={() => setType(k)}
                  />
                ))}
              </View>
              <DateField
                label={t('leave.from')}
                value={from}
                onChange={setFrom}
              />
              <DateField
                label={t('leave.through')}
                value={through}
                onChange={setThrough}
              />
            </View>
          )}
          {hasFilters && (
            <Button variant="link" onPress={clearFilters}>
              {t('leave.clear')}
            </Button>
          )}
          {!!error && (
            <Text accessibilityLiveRegion="polite" className="text-destructive">
              {t(error)}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator />
        ) : readError ? (
          <View className="gap-2">
            <Text>{t('leave.loadError')}</Text>
            <Button variant="outline" onPress={load}>
              {t('common.retry')}
            </Button>
          </View>
        ) : (
          <Text variant="muted">
            {t(
              invalidRange
                ? 'leave.filterDateError'
                : hasFilters
                  ? 'leave.noMatch'
                  : 'leave.empty'
            )}
          </Text>
        )
      }
      renderItem={({ item }) => {
        const expanded = selected === item.id;
        return (
          <View className="rounded-xl border border-border bg-card p-4 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              disabled={busy}
              onPress={() => {
                setSelected(expanded ? '' : item.id);
                setError('');
              }}
              className="gap-1"
            >
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="font-semibold text-foreground">
                  {item.employeeName}
                </Text>
                <Text className="text-primary">
                  {t('leave.status.' + item.status)}
                </Text>
              </View>
              <Text>{t('leave.type.' + item.type)}</Text>
              <Text variant="muted">
                {formatDate(item.startDate)}
                {item.endDate !== item.startDate &&
                  ' – ' + formatDate(item.endDate)}
              </Text>
            </Pressable>
            {expanded && (
              <>
                {!!item.note && <Text>{item.note}</Text>}
                <View className="flex-row flex-wrap gap-2">
                  {item.status === 'pending' && (
                    <>
                      <Button
                        disabled={busy}
                        onPress={() => decide(item.id, 'approved')}
                      >
                        {t('leave.approve')}
                      </Button>
                      <Button
                        disabled={busy}
                        variant="outline"
                        onPress={() => decide(item.id, 'declined')}
                      >
                        {t('leave.decline')}
                      </Button>
                    </>
                  )}
                  {(item.status === 'pending' ||
                    item.status === 'approved') && (
                    <Button
                      disabled={busy}
                      variant="ghost"
                      onPress={() => cancel(item.id)}
                    >
                      {t('leave.cancelRequest')}
                    </Button>
                  )}
                </View>
              </>
            )}
          </View>
        );
      }}
    />
  );
}
