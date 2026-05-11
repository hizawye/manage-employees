import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '../ui/text';

interface InfoRowProps {
  label: string;
  value: string | number;
  icon?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => {
  return (
    <View className="flex-row justify-between items-center py-2 border-b border-border">
      <View className="flex-row items-center flex-1">
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            className="text-muted-foreground mr-2"
          />
        )}
        <Text variant="p" className="text-muted-foreground">
          {label}
        </Text>
      </View>
      <Text variant="p" className="font-semibold text-foreground">
        {value}
      </Text>
    </View>
  );
};
