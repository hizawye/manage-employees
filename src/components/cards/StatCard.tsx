import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sizes } from '../../constants/theme';

interface StatCardProps {
  value: string | number;
  label: string;
  variant?: 'default' | 'colored';
  color?: string;
  icon?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  variant = 'default',
  color,
  icon,
  style,
}) => {
  const theme = useTheme();
  const cardColor = color || theme.colors.primary;

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
        variant === 'colored' && { backgroundColor: cardColor },
        style,
      ]}
      elevation={2}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={variant === 'colored' ? '#fff' : cardColor}
          style={styles.icon}
        />
      )}
      <Text
        variant="headlineSmall"
        style={[
          styles.value,
          variant === 'colored' && styles.coloredValue,
          variant !== 'colored' && { color: cardColor },
        ]}
      >
        {value}
      </Text>
      <Text
        variant="bodySmall"
        style={[
          styles.label,
          { color: theme.colors.onSurfaceVariant },
          variant === 'colored' && styles.coloredLabel,
        ]}
      >
        {label}
      </Text>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: sizes.padding,
    borderRadius: sizes.borderRadius,
    minHeight: 100,
  },
  icon: {
    marginBottom: sizes.paddingSmall,
  },
  value: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  label: {
    textAlign: 'center',
  },
  coloredValue: {
    color: '#fff',
  },
  coloredLabel: {
    color: '#fff',
    opacity: 0.9,
  },
});
