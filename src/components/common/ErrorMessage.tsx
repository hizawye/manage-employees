import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { sizes } from '../../constants/theme';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.centered}>
      <Text style={[styles.error, { color: colors.error }]}>{message}</Text>
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
  error: {
    textAlign: 'center',
    fontSize: 15,
  },
});
