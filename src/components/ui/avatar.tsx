import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

function Avatar({ initials, className, size = "md" }: AvatarProps) {
  return (
    <View
      className={cn(
        "rounded-full bg-primary/10 items-center justify-center",
        sizeMap[size],
        className
      )}
    >
      <Text className="font-semibold text-primary">{initials}</Text>
    </View>
  );
}

export { Avatar };
