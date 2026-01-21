import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { sizes } from '../../constants/theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.centered}>
      <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>{title}</Text>
      {subtitle && <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: sizes.padding,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
