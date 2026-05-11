import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../ui/text';

interface StatCardProps {
  value: string | number;
  label: string;
  variant?: 'default' | 'colored';
  color?: string;
  icon?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  variant = 'default',
  color,
  icon,
  className,
}) => {
  const cardColor = color || 'hsl(217 91% 60%)';

  return (
    <View
      className={`flex-1 items-center justify-center p-4 rounded-xl min-h-[100px] ${
        variant === 'colored' ? '' : 'bg-card border border-border'
      } ${className || ''}`}
      style={variant === 'colored' ? { backgroundColor: cardColor } : undefined}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={variant === 'colored' ? '#fff' : cardColor}
          className="mb-2"
        />
      )}
      <Text
        variant="h3"
        className={`font-bold mb-1 ${variant === 'colored' ? 'text-white' : ''}`}
        style={variant !== 'colored' ? { color: cardColor } : undefined}
      >
        {value}
      </Text>
      <Text
        variant="small"
        className={`text-center ${variant === 'colored' ? 'text-white/90' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </View>
  );
};
