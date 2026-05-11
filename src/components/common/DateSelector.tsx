import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../ui/text';

interface DateSelectorProps {
  mode: 'day' | 'week' | 'month';
  value: Date;
  onChange: (date: Date) => void;
  formatDisplay?: (date: Date) => string;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  mode,
  value,
  onChange,
  formatDisplay,
}) => {
  const handlePrevious = () => {
    const newDate = new Date(value);
    switch (mode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    onChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(value);
    switch (mode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    onChange(newDate);
  };

  const handleToday = () => {
    onChange(new Date());
  };

  const defaultFormatDisplay = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions =
      mode === 'day'
        ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        : mode === 'week'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { year: 'numeric', month: 'long' };

    return date.toLocaleDateString('ar-DZ', options);
  };

  const displayText = formatDisplay ? formatDisplay(value) : defaultFormatDisplay(value);

  return (
    <View className="flex-row items-center justify-between px-2 rounded-xl bg-card border border-border mb-4">
      <Pressable onPress={handlePrevious} className="p-2">
        <MaterialCommunityIcons name="chevron-right" size={24} className="text-primary" />
      </Pressable>
      <Pressable onPress={handleToday} className="flex-1 items-center py-3">
        <Text className="font-semibold text-center text-foreground">
          {displayText}
        </Text>
      </Pressable>
      <Pressable onPress={handleNext} className="p-2">
        <MaterialCommunityIcons name="chevron-left" size={24} className="text-primary" />
      </Pressable>
    </View>
  );
};
