import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';

// Light theme colors (current app colors)
const lightColors = {
  primary: '#1976d2',
  primaryContainer: '#bbdefb',
  secondary: '#26a69a',
  secondaryContainer: '#b2dfdb',
  tertiary: '#7e57c2',
  tertiaryContainer: '#d1c4e9',
  error: '#d32f2f',
  errorContainer: '#ffcdd2',
  background: '#f8f9fa',
  surface: '#ffffff',
  surfaceVariant: '#e3f2fd',
  outline: '#e0e0e0',
  outlineVariant: '#f5f5f5',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#0d47a1',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#004d40',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#311b92',
  onError: '#ffffff',
  onErrorContainer: '#b71c1c',
  onBackground: '#212121',
  onSurface: '#212121',
  onSurfaceVariant: '#757575',
  inverseSurface: '#2c2c2c',
  inverseOnSurface: '#f5f5f5',
  inversePrimary: '#64b5f6',
  shadow: '#000000',
  scrim: '#000000',
  surfaceDisabled: 'rgba(33, 33, 33, 0.12)',
  onSurfaceDisabled: 'rgba(33, 33, 33, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
  // Custom colors
  success: '#4caf50',
  present: '#4caf50',
  absent: '#d32f2f',
  halfDay: '#ff9800',
  border: '#e0e0e0',
};

// Dark theme colors
const darkColors = {
  primary: '#64b5f6',
  primaryContainer: '#1565c0',
  secondary: '#4db6ac',
  secondaryContainer: '#00695c',
  tertiary: '#9575cd',
  tertiaryContainer: '#512da8',
  error: '#ef5350',
  errorContainer: '#c62828',
  background: '#121212',
  surface: '#1e1e1e',
  surfaceVariant: '#2c2c2c',
  outline: '#424242',
  outlineVariant: '#2c2c2c',
  onPrimary: '#0d47a1',
  onPrimaryContainer: '#e3f2fd',
  onSecondary: '#004d40',
  onSecondaryContainer: '#b2dfdb',
  onTertiary: '#311b92',
  onTertiaryContainer: '#d1c4e9',
  onError: '#b71c1c',
  onErrorContainer: '#ffcdd2',
  onBackground: '#e0e0e0',
  onSurface: '#e0e0e0',
  onSurfaceVariant: '#a0a0a0',
  inverseSurface: '#e0e0e0',
  inverseOnSurface: '#1e1e1e',
  inversePrimary: '#1976d2',
  shadow: '#000000',
  scrim: '#000000',
  surfaceDisabled: 'rgba(224, 224, 224, 0.12)',
  onSurfaceDisabled: 'rgba(224, 224, 224, 0.38)',
  backdrop: 'rgba(0, 0, 0, 0.6)',
  // Custom colors
  success: '#66bb6a',
  present: '#66bb6a',
  absent: '#ef5350',
  halfDay: '#ffa726',
  border: '#424242',
};

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};

// Export individual color palettes for direct access if needed
export { lightColors, darkColors };
