import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, sizes } from '../../constants/theme';

interface InfoRowProps {
  label: string;
  value: string | number;
  icon?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={colors.textSecondary}
            style={styles.icon}
          />
        )}
        <Text variant="bodyMedium" style={styles.label}>
          {label}
        </Text>
      </View>
      <Text variant="bodyMedium" style={styles.value}>
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
    borderBottomColor: colors.border,
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
    color: colors.textSecondary,
  },
  value: {
    fontWeight: '600',
    color: colors.text,
  },
});
