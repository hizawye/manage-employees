import { View, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  className?: string;
}

export function LoadingSpinner({ size = 'large', className }: LoadingSpinnerProps) {
  return (
    <View className={`flex-1 justify-center items-center p-4 ${className || ''}`}>
      <ActivityIndicator size={size} className="text-primary" />
    </View>
  );
}
