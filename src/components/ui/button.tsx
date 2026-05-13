import * as React from "react";
import { Pressable as RNPressable, type PressableProps, ActivityIndicator } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./text";

interface ButtonProps extends PressableProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "warning";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const buttonVariants = {
  default: "bg-primary active:opacity-90",
  destructive: "bg-destructive active:opacity-90",
  warning: "bg-amber-500 active:opacity-90",
  outline: "border border-input bg-background active:bg-accent",
  secondary: "bg-secondary active:opacity-80",
  ghost: "active:bg-accent",
  link: "",
};

const textVariants = {
  default: "text-primary-foreground",
  destructive: "text-destructive-foreground",
  warning: "text-amber-100",
  outline: "text-foreground",
  secondary: "text-secondary-foreground",
  ghost: "text-foreground",
  link: "text-primary underline",
};

const sizeVariants = {
  default: "h-10 px-4 py-2 rounded-md",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10 rounded-md",
};

const Button = React.forwardRef<React.ElementRef<typeof RNPressable>, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    return (
      <RNPressable
        ref={ref}
        className={cn(
          "flex-row items-center justify-center gap-2",
          buttonVariants[variant],
          sizeVariants[size],
          (disabled || isLoading) && "opacity-50",
          className
        )}
        disabled={disabled || isLoading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || isLoading, busy: !!isLoading }}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator size="small" className="text-primary-foreground" />
        ) : typeof children === "string" ? (
          <Text className={cn(textVariants[variant], size === "sm" && "text-sm")}>
            {children}
          </Text>
        ) : (
          children
        )}
      </RNPressable>
    );
  }
);
Button.displayName = "Button";

export { Button, type ButtonProps };
