import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, sizes } from '../../constants/theme';

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
  color = colors.primary,
  icon,
  style,
}) => {
  return (
    <Surface
      style={[
        styles.container,
        variant === 'colored' && { backgroundColor: color },
        style,
      ]}
      elevation={2}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={variant === 'colored' ? '#fff' : color}
          style={styles.icon}
        />
      )}
      <Text
        variant="headlineSmall"
        style={[
          styles.value,
          variant === 'colored' && styles.coloredValue,
          !variant && { color },
        ]}
      >
        {value}
      </Text>
      <Text
        variant="bodySmall"
        style={[
          styles.label,
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
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
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
