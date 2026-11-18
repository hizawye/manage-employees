import { useRef, useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { useAuth } from '../../src/auth/useAuth';
import { Button } from '../../src/components/ui/button';
import { Text } from '../../src/components/ui/text';
import { t } from '../../src/i18n';
import {
  employeeTemplate,
  importRoster,
  previewRoster,
  rosterFileLimit,
  type RosterPreview,
} from '../../src/workforce/employeeImport';
import { shareReport } from '../../src/workforce/shareReport';

export default function ImportEmployeesScreen() {
  const owner = useAuth().user?.id;
  return owner === undefined ? null : (
    <ImportWorkspace key={owner} owner={owner} />
  );
}

type FilePreview = { name: string; text: string; preview: RosterPreview };
const knownErrors = new Set([
  'work.badHeader',
  'work.fileTooLarge',
  'work.invalid',
  'leave.importQuotes',
  'leave.importEmpty',
]);
function message(error: unknown, fallback: string) {
  const key = error instanceof Error ? error.message : '';
  return t(knownErrors.has(key) ? key : fallback);
}

async function readFile(asset: DocumentPicker.DocumentPickerAsset) {
  if ((asset.size || 0) > rosterFileLimit) throw new Error('work.fileTooLarge');
  if (Platform.OS === 'web' && asset.file) {
    if (asset.file.size > rosterFileLimit) throw new Error('work.fileTooLarge');
    return asset.file.text();
  }
  const file = new File(asset.uri);
  try {
    if (file.size > rosterFileLimit) throw new Error('work.fileTooLarge');
    return await file.text();
  } finally {
    if (
      file.exists &&
      file.uri.startsWith(Paths.cache.uri.replace(/\/?$/, '/'))
    )
      file.delete();
  }
}

function ImportWorkspace({ owner }: { owner: number }) {
  const [file, setFile] = useState<FilePreview>();
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  async function run(action: () => Promise<void>, fallback: string) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(message(e, fallback));
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  function choose() {
    return run(async () => {
      const selected = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (selected.canceled) return;
      setFile(undefined);
      setResult('');
      const asset = selected.assets[0];
      const text = await readFile(asset);
      setFile({
        name: asset.name,
        text,
        preview: await previewRoster(owner, text),
      });
    }, 'work.fileError');
  }
  function save() {
    if (!file) return;
    const selected = file;
    return run(async () => {
      const counts = await importRoster(owner, selected.text);
      setFile(undefined);
      setResult(t('work.importDone', counts));
    }, 'work.saveError');
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4 pb-12 gap-2"
      data={file?.preview.rows ?? []}
      keyExtractor={(row) => String(row.row)}
      ListHeaderComponent={
        <View className="gap-3">
          <Text>{t('work.importHelp')}</Text>
          <Text variant="muted">
            {t('leave.importReview')} {t('leave.importExample')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Button disabled={busy} onPress={choose}>
              {t('work.pickFile')}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onPress={() =>
                run(
                  () =>
                    shareReport(
                      'employees-template',
                      'csv',
                      employeeTemplate()
                    ),
                  'work.exportError'
                )
              }
            >
              {t('work.template')}
            </Button>
          </View>
          {!!result && (
            <Text className="text-primary" accessibilityLiveRegion="polite">
              {result}
            </Text>
          )}
          {!!error && (
            <Text className="text-destructive" accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          {file && (
            <View className="bg-card rounded-xl border border-border p-4 gap-2">
              <Text variant="h4">{file.name}</Text>
              <Text>
                {t('work.importReady', { count: file.preview.ready })}
              </Text>
              {file.preview.invalid > 0 && (
                <Text className="text-destructive">
                  {t('leave.importBlocked')}
                </Text>
              )}
              <Button
                disabled={
                  busy || file.preview.ready === 0 || file.preview.invalid > 0
                }
                onPress={save}
              >
                {t('work.import')}
              </Button>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View className="p-3 border-b border-border">
          <Text className="font-semibold">
            {item.name || t('work.rowError', { row: item.row })}
          </Text>
          {item.state === 'invalid' ? (
            <Text className="text-destructive">
              {item.field
                ? t('leave.importField', { row: item.row, field: item.field })
                : t('work.rowError', { row: item.row })}
            </Text>
          ) : (
            <Text variant="muted">
              {t(
                item.state === 'duplicate'
                  ? 'leave.importSkippedRow'
                  : 'leave.importReadyRow'
              )}
            </Text>
          )}
        </View>
      )}
    />
  );
}
