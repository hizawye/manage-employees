import { View, TextInput, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  className?: string;
}

export function SearchInput({ placeholder, value, onChangeText, className }: SearchInputProps) {
  const handleClear = () => onChangeText('');
  const showClearButton = value.length > 0;

  return (
    <View
      className={cn(
        "flex-row items-center rounded-xl border border-border bg-card px-4 py-2.5 gap-3",
        className
      )}
    >
      <MaterialCommunityIcons name="magnify" size={22} className="text-primary" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="hsl(215 16% 47%)"
        className="flex-1 text-base text-foreground h-full"
      />
      {showClearButton && (
        <TouchableOpacity onPress={handleClear} className="p-1">
          <MaterialCommunityIcons name="close-circle" size={20} className="text-muted-foreground" />
        </TouchableOpacity>
      )}
    </View>
  );
}
