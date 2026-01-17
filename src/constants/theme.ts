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

// Common reusable styles
export const commonStyles = {
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: sizes.padding,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: sizes.borderRadius,
    elevation: 2,
    marginBottom: sizes.padding,
  },
  cardContent: {
    padding: sizes.padding,
  },

  // Text styles
  title: {
    fontSize: 20,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  body: {
    fontSize: 14,
    color: colors.text,
  },
  caption: {
    fontSize: 12,
    color: colors.textLight,
  },

  // Inputs
  input: {
    backgroundColor: colors.surface,
  },
  inputContent: {
    textAlign: isRTL ? ('right' as const) : ('left' as const),
  },
  inputOutline: {
    borderRadius: sizes.borderRadius,
  },

  // Buttons
  button: {
    borderRadius: sizes.borderRadius,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: typography.semibold,
  },

  // Lists
  list: {
    padding: sizes.padding,
    paddingTop: 0,
  },

  // FAB
  fab: {
    position: 'absolute' as const,
    backgroundColor: colors.primary,
    borderRadius: sizes.borderRadiusLarge,
  },
  fabBottom: {
    bottom: sizes.padding,
  },
  fabRight: {
    right: isRTL ? undefined : sizes.padding,
    left: isRTL ? sizes.padding : undefined,
  },

  // Divider
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Shadows
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
};
