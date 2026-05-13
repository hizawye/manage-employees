import * as React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

interface ThemedTextProps extends TextProps {
  variant?: "h1" | "h2" | "h3" | "h4" | "p" | "lead" | "large" | "small" | "muted" | "label";
}

const variantStyles = {
  h1: "text-4xl font-bold tracking-tight text-foreground",
  h2: "text-3xl font-semibold tracking-tight text-foreground",
  h3: "text-2xl font-semibold tracking-tight text-foreground",
  h4: "text-xl font-semibold tracking-tight text-foreground",
  p: "text-base leading-7 text-foreground",
  lead: "text-xl text-muted-foreground",
  large: "text-lg font-semibold text-foreground",
  small: "text-sm font-medium leading-none text-foreground",
  muted: "text-sm text-muted-foreground",
  label: "text-sm font-medium leading-none text-foreground",
};

const Text = React.forwardRef<RNText, ThemedTextProps>(
  ({ className, variant = "p", ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(variantStyles[variant], className)}
        {...props}
      />
    );
  }
);
Text.displayName = "Text";

export { Text };