import { Pressable as RNPressable, type PressableProps } from "react-native";

interface Props extends PressableProps {
  className?: string;
}

export function Pressable({ children, className = "", ...props }: Props) {
  return (
    <RNPressable
      className={`${className} active:opacity-70`}
      android_ripple={{ color: "rgba(0,0,0,0.1)" }}
      {...props}
    >
      {children}
    </RNPressable>
  );
}