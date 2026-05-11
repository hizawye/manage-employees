import * as React from "react";
import { View } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./text";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

function EmptyState({ icon, title, subtitle, className }: EmptyStateProps) {
  return (
    <View className={cn("flex-1 items-center justify-center px-8 py-16", className)}>
      {icon && <View className="mb-4 opacity-50">{icon}</View>}
      <Text variant="h4" className="text-center mb-2">
        {title}
      </Text>
      {subtitle && (
        <Text variant="muted" className="text-center">
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export { EmptyState };
