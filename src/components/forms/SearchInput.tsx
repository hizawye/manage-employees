import { View, TextInput, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, sizes } from '../../constants/theme';

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: ViewStyle;
}

export function SearchInput({ placeholder, value, onChangeText, style }: SearchInputProps) {
  const handleClear = () => onChangeText('');
  const showClearButton = value.length > 0;

  return (
    <View style={[styles.container, style]}>
      {/* Search Icon (RIGHT for RTL) */}
      <Icon
        source="magnify"
        size={24}
        color={colors.primary}
      />

      {/* Text Input with RTL support */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />

      {/* Clear Button (LEFT for RTL, only when text exists) */}
      {showClearButton && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Icon
            source="close-circle"
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',  // Icons in RTL positions
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: sizes.borderRadius,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',      // RTL alignment
    writingDirection: 'rtl',  // Force RTL text flow
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
});
