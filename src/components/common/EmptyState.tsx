import { View, Text } from "react-native";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  subtitle,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <View className={`flex-1 justify-center items-center px-4 py-8 ${className || ""}`}>
      {icon && <View className="mb-4 opacity-50">{icon}</View>}
      <Text className="text-xl font-semibold text-center text-muted-foreground mb-2">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-sm text-center text-muted-foreground/60">
          {subtitle}
        </Text>
      )}
    </View>
  );
}