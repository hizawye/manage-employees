import { View, StyleSheet, I18nManager } from 'react-native';
import { TextInput, HelperText, TextInputProps, useTheme } from 'react-native-paper';
import { sizes } from '../../constants/theme';
import { t } from '../../i18n';

const isRTL = I18nManager.isRTL;

interface FormInputProps extends Omit<TextInputProps, 'mode' | 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: boolean;
  errorMessage?: string | undefined;
  multiline?: boolean;
  numberOfLines?: number;
}

export function FormInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  errorMessage,
  multiline = false,
  numberOfLines,
  ...rest
}: FormInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.inputContainer}>
      <TextInput
        label={label}
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        error={error}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[styles.input, { backgroundColor: colors.surface }, multiline && styles.textArea]}
        contentStyle={styles.inputContent}
        outlineStyle={styles.inputOutline}
        {...rest}
      />
      {error && errorMessage && (
        <HelperText type="error" style={styles.errorText}>
          {t(errorMessage || 'validation.required')}
        </HelperText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: sizes.padding,
  },
  input: {
  },
  inputContent: {
    textAlign: isRTL ? 'right' : 'left',
  },
  inputOutline: {
    borderRadius: sizes.borderRadius,
  },
  textArea: {
    minHeight: 100,
  },
  errorText: {
    fontSize: 13,
  },
});
