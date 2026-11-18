import { Directory, File, Paths } from 'expo-file-system';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import { t } from '../i18n';

export async function shareReport(
  name: string,
  format: 'csv' | 'pdf' | 'ics',
  content: string
) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(t('work.shareUnavailable'));
  const directory = new Directory(Paths.cache, 'workforce-exports');
  directory.create({ idempotent: true });
  // Some Android recipients read the shared URI after the chooser returns.
  for (const prior of directory.list()) {
    if (
      prior instanceof File &&
      prior.modificationTime &&
      Date.now() - prior.modificationTime > 86400000
    )
      prior.delete();
  }
  const file = new File(directory, `${name}-${randomUUID()}.${format}`);
  if (format === 'pdf') {
    const { uri } = await printToFileAsync({ html: content });
    new File(uri).move(file);
  } else {
    file.create();
    file.write(content);
  }
  const mime = {
    csv: 'text/csv',
    pdf: 'application/pdf',
    ics: 'text/calendar',
  }[format];
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: mime,
      UTI: {
        csv: 'public.comma-separated-values-text',
        pdf: 'com.adobe.pdf',
        ics: 'com.apple.ical.ics',
      }[format],
    });
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}
