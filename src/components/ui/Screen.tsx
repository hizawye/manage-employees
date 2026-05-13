import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar, View } from "react-native";

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  className?: string;
}

export function Screen({
  children,
  scrollable = false,
  className = "",
}: ScreenProps) {
  const content = (
    <View className={`flex-1 bg-background ${className}`}>
      <StatusBar barStyle="light-content" />
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {scrollable ? <>{content}</> : content}
    </SafeAreaView>
  );
}