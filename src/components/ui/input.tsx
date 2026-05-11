import * as React from "react";
import { TextInput, type TextInputProps, View, Text } from "react-native";
import { cn } from "@/lib/utils";

export interface InputProps extends TextInputProps {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, iconLeft, iconRight, error, ...props }, ref) => {
    return (
      <View className="w-full">
        <View
          className={cn(
            "flex-row items-center h-12 rounded-lg border bg-background px-3",
            error ? "border-destructive" : "border-border",
            props.editable === false && "opacity-50",
            className
          )}
        >
          {iconLeft && <View className="mr-2">{iconLeft}</View>}
          <TextInput
            ref={ref}
            className="flex-1 text-base text-foreground h-full"
            placeholderTextColor="hsl(215 16% 47%)"
            {...props}
          />
          {iconRight && <View className="ml-2">{iconRight}</View>}
        </View>
        {error ? (
          <Text className="text-sm text-destructive mt-1">{error}</Text>
        ) : null}
      </View>
    );
  }
);
Input.displayName = "Input";

export { Input };
