import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, sizes } from '../../constants/theme';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <View style={styles.centered}>
      <Text style={styles.error}>{message}</Text>
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
    color: colors.error,
    textAlign: 'center',
    fontSize: 15,
  },
});
