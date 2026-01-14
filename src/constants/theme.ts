import { I18nManager } from 'react-native';

export const colors = {
  primary: '#1976d2',
  primaryDark: '#1565c0',
  secondary: '#26a69a',
  background: '#f8f9fa',
  surface: '#ffffff',
  error: '#d32f2f',
  success: '#2e7d32',
  warning: '#f57c00',
  text: '#212121',
  textSecondary: '#757575',
  textLight: '#9e9e9e',
  border: '#e0e0e0',
  present: '#2e7d32',
  absent: '#c62828',
  halfDay: '#f57c00',
};

export const sizes = {
  padding: 16,
  paddingSmall: 8,
  paddingLarge: 24,
  borderRadius: 12,
  borderRadiusLarge: 20,
};

// RTL-aware styles
export const isRTL = I18nManager.isRTL;

export const rtlStyles = {
  // Flex direction that respects RTL
  row: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
  } as const,
  rowReverse: {
    flexDirection: isRTL ? 'row' : 'row-reverse',
  } as const,
  // Text alignment
  textAlign: isRTL ? 'right' : 'left',
  textAlignOpposite: isRTL ? 'left' : 'right',
  // Margins and paddings
  marginStart: isRTL ? 'marginRight' : 'marginLeft',
  marginEnd: isRTL ? 'marginLeft' : 'marginRight',
  paddingStart: isRTL ? 'paddingRight' : 'paddingLeft',
  paddingEnd: isRTL ? 'paddingLeft' : 'paddingRight',
};

// Arabic-optimized typography
export const typography = {
  // Slightly larger line height for Arabic text
  lineHeight: 1.6,
  // Font weights that work well with Arabic
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

