import { View } from 'react-native';
import { Text } from '../ui/text';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-center text-destructive text-base">{message}</Text>
    </View>
  );
}
