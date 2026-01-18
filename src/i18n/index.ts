import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';
import en from './locales/en';
import ar from './locales/ar';

const i18n = new I18n({
  en,
  ar,
});

// Force Arabic as default language regardless of device settings
i18n.locale = 'ar';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

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
export function setLocale(locale: 'en' | 'ar'): void {
  i18n.locale = locale;
}

// Check if current locale is Arabic
export function isArabic(): boolean {
  return i18n.locale === 'ar';
}

export default i18n;
