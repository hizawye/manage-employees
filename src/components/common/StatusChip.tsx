import React from "react";
import { View, Text } from "react-native";

interface StatusChipProps {
  type: "employee" | "attendance";
  status: string;
  compact?: boolean;
}

const attendanceVariants: Record<string, string> = {
  present: "bg-emerald-500/15 text-emerald-700",
  half_day: "bg-amber-500/15 text-amber-700",
  absent: "bg-red-500/15 text-red-700",
};

const employeeVariants: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700",
  inactive: "bg-red-500/15 text-red-700",
};

const labelMap: Record<string, string> = {
  present: "حاضر",
  half_day: "نصف يوم",
  absent: "غائب",
  active: "نشط",
  inactive: "غير نشط",
};

export function StatusChip({ type, status }: StatusChipProps) {
  const variant =
    type === "attendance"
      ? attendanceVariants[status] || "bg-secondary text-secondary-foreground"
      : employeeVariants[status] || "bg-secondary text-secondary-foreground";

  const label = labelMap[status] || status;

  return (
    <View
      className={`px-2 py-0.5 rounded-full ${variant} self-start min-w-[28px] items-center`}
    >
      <Text className="text-[8px] font-semibold leading-[8px] text-center">
        {label}
      </Text>
    </View>
  );
}