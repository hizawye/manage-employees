import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { colors, sizes } from '../../constants/theme';

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
    <View style={styles.container}>
      <IconButton
        icon="chevron-right"
        size={24}
        onPress={handlePrevious}
        iconColor={colors.primary}
      />
      <View style={styles.dateDisplay}>
        <Text variant="titleMedium" style={styles.dateText} onPress={handleToday}>
          {displayText}
        </Text>
      </View>
      <IconButton
        icon="chevron-left"
        size={24}
        onPress={handleNext}
        iconColor={colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.paddingSmall,
    backgroundColor: colors.surface,
    borderRadius: sizes.borderRadius,
    marginBottom: sizes.padding,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
