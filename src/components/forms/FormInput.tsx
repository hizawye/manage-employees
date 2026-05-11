import { View, TextInput, TextInputProps, I18nManager } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from '../ui/text';
import { t } from '../../i18n';

const isRTL = I18nManager.isRTL;

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: boolean;
  errorMessage?: string | undefined;
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
  className,
  ...rest
}: FormInputProps) {
  return (
    <View className={cn("mb-4", className)}>
      <Text variant="label" className="mb-1.5 text-foreground">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor="hsl(215 16% 47%)"
        className={cn(
          "w-full rounded-lg border bg-background px-3 py-2.5 text-base text-foreground",
          error ? "border-destructive" : "border-border",
          multiline && "min-h-[100px] text-align-top"
        )}
        style={{ textAlign: isRTL ? 'right' : 'left' }}
        {...rest}
      />
      {error && errorMessage && (
        <Text className="text-sm text-destructive mt-1">
          {t(errorMessage || 'validation.required')}
        </Text>
      )}
    </View>
  );
}
