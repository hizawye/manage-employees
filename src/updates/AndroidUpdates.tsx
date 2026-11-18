import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import { Alert, AppState, Linking, Platform, View } from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import appConfig from '../../app.json';
import { t } from '../i18n';
import { needsSigningMigration } from './signingMigration';
import { Button } from '../components/ui/button';
import { Text } from '../components/ui/text';
import {
  apkUrl,
  fetchPublishedVersion,
  isNewerVersion,
  isReleaseVersion,
} from './androidRelease';

export const installedVersion =
  Application.nativeApplicationVersion ?? appConfig.expo.version;
const CHECK_INTERVAL = 12 * 60 * 60 * 1000;
const RETRY_INTERVAL = 15 * 60 * 1000;
const CACHE = `@app/android-release/v1/${installedVersion}`;
const DISMISSED = '@app/android-release/dismissed';

interface CheckResult {
  at: number;
  status: 'idle' | 'current' | 'empty' | 'available' | 'error';
  available: string | null;
}
const idle: CheckResult = { at: 0, status: 'idle', available: null };
function readResult(raw: string | null): CheckResult {
  if (!raw) return idle;
  try {
    const value = JSON.parse(raw);
    if (
      !value ||
      !Number.isFinite(value.at) ||
      !['current', 'empty', 'available', 'error'].includes(value.status)
    )
      return idle;
    const version = value.available;
    if (
      version !== null &&
      (!isReleaseVersion(version) || !isNewerVersion(version, installedVersion))
    )
      return idle;
    if (value.status === 'available' && !version) return idle;
    if (
      (value.status === 'current' || value.status === 'empty') &&
      version !== null
    )
      return idle;
    return { at: value.at, status: value.status, available: version };
  } catch {
    return idle;
  }
}

interface UpdateState {
  result: CheckResult;
  checking: boolean;
  dismissed: string | null;
  migration: boolean;
  check: (manual?: boolean) => Promise<void>;
  dismiss: (version: string) => void;
}
const Updates = createContext<UpdateState | null>(null);

export function AndroidUpdatesProvider({ children }: PropsWithChildren) {
  const enabled =
    Platform.OS === 'android' &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    isReleaseVersion(installedVersion);
  const [migration] = useState(needsSigningMigration);
  const [result, setResult] = useState<CheckResult>(idle);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const last = useRef<CheckResult>(idle);
  const hydration = useRef<Promise<void> | null>(null);
  const checkingNow = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);

  const check = useCallback(
    (manual = false): Promise<void> => {
      if (!enabled) return Promise.resolve();
      if (checkingNow.current) return checkingNow.current;
      const run = async () => {
        if (!hydration.current) {
          hydration.current = Promise.all([
            AsyncStorage.getItem(CACHE),
            AsyncStorage.getItem(DISMISSED),
          ])
            .then(([saved, skip]) => {
              last.current = readResult(saved);
              if (mounted.current) {
                setResult(last.current);
                setDismissed(skip);
              }
            })
            .catch(() => undefined);
        }
        await hydration.current;
        if (!mounted.current || (!manual && AppState.currentState !== 'active'))
          return;
        const cached = last.current;
        const age = Date.now() - cached.at;
        if (
          !manual &&
          cached.status !== 'idle' &&
          age >= 0 &&
          age < (cached.status === 'error' ? RETRY_INTERVAL : CHECK_INTERVAL)
        )
          return;
        setChecking(true);
        let next: CheckResult;
        try {
          const version = await fetchPublishedVersion();
          const available =
            version && isNewerVersion(version, installedVersion)
              ? version
              : null;
          next = {
            at: Date.now(),
            status: available ? 'available' : version ? 'current' : 'empty',
            available,
          };
        } catch {
          next = {
            at: Date.now(),
            status: 'error',
            available: cached.available,
          };
        }
        last.current = next;
        if (mounted.current) {
          setResult(next);
          setChecking(false);
        }
        await AsyncStorage.setItem(CACHE, JSON.stringify(next)).catch(
          () => undefined
        );
      };
      checkingNow.current = run().finally(() => {
        checkingNow.current = null;
      });
      return checkingNow.current;
    },
    [enabled]
  );

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    if (AppState.currentState === 'active') void check();
    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [enabled, check]);

  const dismiss = useCallback((version: string) => {
    setDismissed(version);
    void AsyncStorage.setItem(DISMISSED, version).catch(() => undefined);
  }, []);
  return (
    <Updates.Provider
      value={
        enabled
          ? { result, checking, dismissed, check, dismiss, migration }
          : null
      }
    >
      {children}
    </Updates.Provider>
  );
}

async function download(version: string) {
  try {
    await Linking.openURL(apkUrl(version));
  } catch {
    Alert.alert(t('updates.title'), t('updates.openError'));
  }
}

function SigningMigrationNotice() {
  return (
    <>
      <Text
        accessibilityLiveRegion="polite"
        className="font-semibold text-foreground"
      >
        {t('updates.migrationTitle')}
      </Text>
      <Text variant="muted">{t('updates.migrationHint')}</Text>
      <Button onPress={() => void download(installedVersion)}>
        {t('updates.migrationAction')}
      </Button>
    </>
  );
}

export function AndroidUpdateBanner() {
  const pathname = usePathname();
  const updates = useContext(Updates);
  if (updates?.migration && pathname !== '/profile') {
    return (
      <SafeAreaView edges={['bottom']} className="bg-card">
        <View className="border-t border-border px-4 py-2 gap-2">
          <SigningMigrationNotice />
        </View>
      </SafeAreaView>
    );
  }
  const version = updates?.result.available;
  if (
    !updates ||
    !version ||
    version === updates.dismissed ||
    pathname === '/profile'
  )
    return null;
  return (
    <SafeAreaView edges={['bottom']} className="bg-card">
      <View className="border-t border-border px-4 py-2 gap-2">
        <Text
          accessibilityLiveRegion="polite"
          className="font-semibold text-foreground"
        >
          {t('updates.available', { version })}
        </Text>
        <View className="flex-row gap-2 flex-wrap">
          <Button size="sm" onPress={() => void download(version)}>
            {t('updates.download')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => updates.dismiss(version)}
          >
            {t('updates.dismiss')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function AndroidUpdateSettings() {
  const updates = useContext(Updates);
  if (!updates) return null;
  if (updates.migration)
    return (
      <View className="gap-2 mt-2 pt-3 border-t border-border">
        <SigningMigrationNotice />
      </View>
    );
  const { result, checking } = updates;
  return (
    <View className="gap-2 mt-2 pt-3 border-t border-border">
      <Text className="font-semibold text-foreground">
        {t('updates.title')}
      </Text>
      {result.available && (
        <>
          <Text>{t('updates.available', { version: result.available })}</Text>
          <Text variant="muted">{t('updates.installHint')}</Text>
        </>
      )}
      {result.status !== 'idle' && result.status !== 'available' && (
        <Text accessibilityLiveRegion="polite" variant="muted">
          {t('updates.' + result.status)}
        </Text>
      )}
      <View className="flex-row flex-wrap gap-2">
        {result.available && (
          <Button onPress={() => void download(result.available!)}>
            {t('updates.download')}
          </Button>
        )}
        <Button
          isLoading={checking}
          accessibilityLabel={t('updates.check')}
          variant="outline"
          onPress={() => void updates.check(true)}
        >
          {t('updates.check')}
        </Button>
      </View>
    </View>
  );
}
