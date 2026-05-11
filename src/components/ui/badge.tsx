import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
  children: React.ReactNode;
  className?: string;
}

const badgeVariants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border border-border text-foreground",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <View className={cn("px-2.5 py-0.5 rounded-full", badgeVariants[variant], className)}>
      <Text className={cn("text-xs font-semibold", badgeVariants[variant].split(" ").pop())}>
        {children}
      </Text>
    </View>
  );
}

export { Badge };
