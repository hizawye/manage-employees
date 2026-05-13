import { View, Text } from "react-native";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <View className={`flex-1 justify-center items-center p-4 ${className || ""}`}>
      <Text className="text-center text-destructive text-base">{message}</Text>
    </View>
  );
}