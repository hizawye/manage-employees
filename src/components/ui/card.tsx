import * as React from "react";
import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<View, ViewProps>(
  ({ className, ...props }, ref) => (
    <View
      ref={ref}
      className={cn("rounded-xl border border-border bg-card", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = ({ className, ...props }: ViewProps) => (
  <View className={cn("p-4", className)} {...props} />
);

const CardContent = ({ className, ...props }: ViewProps) => (
  <View className={cn("p-4 pt-0", className)} {...props} />
);

const CardFooter = ({ className, ...props }: ViewProps) => (
  <View className={cn("flex-row items-center p-4 pt-0", className)} {...props} />
);

export { Card, CardHeader, CardContent, CardFooter };
