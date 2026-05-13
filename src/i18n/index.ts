import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en';
import ar from './locales/ar';

const i18n = new I18n({
  en,
  ar,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// Load saved locale on init
const LOCALE_KEY = '@app/locale';

async function loadSavedLocale() {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_KEY);
    if (saved === 'en' || saved === 'ar') {
      i18n.locale = saved;
      if (saved === 'ar') {
        I18nManager.forceRTL(true);
      } else {
        I18nManager.forceRTL(false);
      }
    } else {
      // Default to Arabic
      i18n.locale = 'ar';
      I18nManager.forceRTL(true);
    }
  } catch {
    i18n.locale = 'ar';
    I18nManager.forceRTL(true);
  }
}

// Run immediately and expose readiness so navigation does not render with stale direction.
export const localeReady = loadSavedLocale();

// Check if the current language is RTL
export const isRTL = i18n.locale === 'ar';

// Enable RTL layout for Arabic (must be called before any UI renders)
if (isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// Translation function
export function t(key: string, options?: Record<string, string | number>): string {
  return i18n.t(key, options);
}

// Get current locale
export function getLocale(): string {
  return i18n.locale;
}

// Set locale manually
export async function setLocale(locale: 'en' | 'ar'): Promise<void> {
  i18n.locale = locale;
  await AsyncStorage.setItem(LOCALE_KEY, locale);
  // Note: RTL change requires app reload
}

// Check if current locale is Arabic
export function isArabic(): boolean {
  return i18n.locale === 'ar';
}

export default i18n;
