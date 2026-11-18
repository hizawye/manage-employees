import { normalizeDigits } from '../../src/utils/numberUtils';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { subMonths } from 'date-fns';
import { useAuth } from '../../src/auth/useAuth';
import { useEmployees } from '../../src/hooks/useEmployees';
import { Text } from '../../src/components/ui/text';
import { Button } from '../../src/components/ui/button';
import { getLocale, t } from '../../src/i18n';
import { getWeekRange, getMonthRange } from '../../src/utils/dateUtils';
import {
  loadReport,
  reportKinds,
  validReportRange,
  type ReportKind,
  type WorkforceReport,
} from '../../src/workforce/reports';
import {
  calendarText,
  csvText,
  printableReport,
} from '../../src/workforce/fileFormats';
import { shareReport } from '../../src/workforce/shareReport';

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
      className={`min-h-11 rounded-lg px-3 justify-center border ${selected ? 'bg-primary border-primary' : 'bg-card border-border'}`}
    >
      <Text
        className={selected ? 'text-primary-foreground' : 'text-foreground'}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export default function ReportsScreen() {
  const owner = useAuth().user?.id;
  const { employees, error: rosterError } = useEmployees();
  const [kind, setKind] = useState<ReportKind>('payroll');
  const [period, setPeriod] = useState('month');
  const [range, setRange] = useState(getMonthRange);
  const [employeeId, setEmployee] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{
    key: string;
    report?: WorkforceReport;
    failed?: boolean;
  }>();
  const valid = validReportRange(range.start, range.end);
  const key = JSON.stringify([owner, kind, range, employeeId, retry]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (owner !== undefined && valid) {
        setState({ key });
        loadReport(owner, kind, range.start, range.end, employeeId)
          .then((report) => {
            if (active) setState({ key, report });
          })
          .catch(() => {
            if (active) setState({ key, failed: true });
          });
      }
      return () => {
        active = false;
      };
    }, [key, owner, kind, range, employeeId, valid])
  );
  const current = state?.key === key ? state : undefined;
  const report = current?.report;
  const headers = report?.columns.map((col) => t('work.headers.' + col)) ?? [];
  const exportFile = async (format: 'csv' | 'pdf' | 'ics') => {
    if (!report || busy) return;
    setBusy(true);
    try {
      const content =
        format === 'csv'
          ? csvText([headers, ...report.rows])
          : format === 'ics'
            ? calendarText(report.events ?? [])
            : printableReport(
                t('work.' + kind),
                `${range.start} – ${range.end}`,
                headers,
                report.rows,
                getLocale() === 'ar'
              );
      await shareReport(`${kind}-${range.start}-${range.end}`, format, content);
    } catch {
      Alert.alert(t('common.error'), t('work.exportError'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row flex-wrap gap-2">
        {reportKinds.map((k) => (
          <Choice
            key={k}
            selected={kind === k}
            label={t('work.' + k)}
            onPress={() => setKind(k)}
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {(['week', 'month', 'previousMonth', 'custom'] as const).map((p) => (
          <Choice
            key={p}
            selected={p === period}
            label={t('work.' + p)}
            onPress={() => {
              setPeriod(p);
              if (p !== 'custom')
                setRange(
                  p === 'week'
                    ? getWeekRange()
                    : getMonthRange(
                        p === 'previousMonth'
                          ? subMonths(new Date(), 1)
                          : new Date()
                      )
                );
            }}
          />
        ))}
      </View>
      {period === 'custom' ? (
        <View className="flex-row gap-2">
          {(['start', 'end'] as const).map((field) => (
            <View key={field} className="flex-1">
              <Text variant="muted">
                {t(field === 'start' ? 'work.from' : 'work.to')}
              </Text>
              <TextInput
                className="bg-card border border-border p-2 rounded-lg text-foreground"
                accessibilityLabel={t(
                  field === 'start' ? 'work.from' : 'work.to'
                )}
                placeholder="YYYY-MM-DD"
                value={range[field]}
                onChangeText={(v) =>
                  setRange((r) => ({ ...r, [field]: normalizeDigits(v) }))
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <Text variant="muted">
          {range.start} – {range.end}
        </Text>
      )}
      <Button variant="outline" onPress={() => setPicking(!picking)}>
        {employees.find((e) => e.id === employeeId)?.name ?? t('work.all')}
      </Button>
      {picking && (
        <View className="flex-row flex-wrap gap-2">
          {[undefined, ...employees].map((e) => (
            <Choice
              key={e?.id ?? 'all'}
              selected={employeeId === e?.id}
              label={e?.name ?? t('work.all')}
              onPress={() => {
                setEmployee(e?.id);
                setPicking(false);
              }}
            />
          ))}
        </View>
      )}
      {rosterError && <Text className="text-destructive">{rosterError}</Text>}
      {!valid ? (
        <Text className="text-destructive">{t('work.rangeError')}</Text>
      ) : current?.failed ? (
        <Button variant="outline" onPress={() => setRetry((v) => v + 1)}>
          {t('work.loadError') + ' · ' + t('common.retry')}
        </Button>
      ) : !report ? (
        <ActivityIndicator />
      ) : !report.rows.length ? (
        <Text>{t('work.noRows')}</Text>
      ) : (
        <>
          <View className="flex-row flex-wrap gap-2">
            <Button disabled={busy} onPress={() => exportFile('csv')}>
              {t('work.csv')}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onPress={() => exportFile('pdf')}
            >
              {t('work.pdf')}
            </Button>
            {kind === 'shifts' && (
              <Button
                variant="outline"
                disabled={busy}
                onPress={() => exportFile('ics')}
              >
                {t('work.calendar')}
              </Button>
            )}
          </View>
          <Text className="font-semibold text-foreground">
            {t('work.preview')} ·{' '}
            {t('work.rows', { count: report.rows.length })}
          </Text>
          {(kind === 'payroll' || kind === 'punches') && (
            <Text variant="muted">
              {t(kind === 'payroll' ? 'work.payrollHint' : 'work.localTime')}
            </Text>
          )}
          <ScrollView horizontal>
            <View>
              {[headers, ...report.rows.slice(0, 20)].map((row, i) => (
                <View
                  key={i}
                  className={`flex-row border-b border-border ${i === 0 ? 'bg-muted' : 'bg-card'}`}
                >
                  {row.map((v, j) => (
                    <Text
                      key={j}
                      className="w-32 px-2 py-2 text-foreground"
                      numberOfLines={3}
                    >
                      {v}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </ScrollView>
  );
}
