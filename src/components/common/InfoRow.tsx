import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sizes } from '../../constants/theme';

interface InfoRowProps {
  label: string;
  value: string | number;
  icon?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.outlineVariant }]}>
      <View style={styles.labelContainer}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={colors.onSurfaceVariant}
            style={styles.icon}
          />
        )}
        <Text variant="bodyMedium" style={[styles.label, { color: colors.onSurfaceVariant }]}>
          {label}
        </Text>
      </View>
      <Text variant="bodyMedium" style={[styles.value, { color: colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: sizes.paddingSmall,
    borderBottomWidth: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: sizes.paddingSmall,
  },
  label: {
  },
  value: {
    fontWeight: '600',
  },
});
