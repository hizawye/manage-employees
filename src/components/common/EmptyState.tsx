import { View } from 'react-native';
import { Text } from '../ui/text';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-xl font-semibold text-center text-muted-foreground">
        {title}
      </Text>
      {subtitle && (
        <Text className="mt-3 text-center text-base text-muted-foreground leading-6">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
