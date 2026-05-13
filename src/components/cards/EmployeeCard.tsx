import { memo } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../ui/text";
import { Employee, WageType } from "../../models";
import { formatCurrency } from "../../utils/dateUtils";
import { t } from "../../i18n";

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
}

function EmployeeCardComponent({ employee, onPress }: EmployeeCardProps) {
  const statusColor =
    employee.status === "active"
      ? "bg-emerald-500/15 text-emerald-700"
      : "bg-red-500/15 text-red-700";
  const statusLabel =
    employee.status === "active" ? t("employee.active") : t("employee.inactive");

  return (
    <Pressable onPress={onPress} className="mb-4">
      <View className="rounded-xl border border-border bg-card overflow-hidden">
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-2">
              <Text variant="large" className="font-bold text-foreground">
                {employee.name}
              </Text>
              <Text variant="muted" className="mt-1">
                {employee.role}
              </Text>
            </View>
            <View
              className={`px-2 py-0.5 rounded-full ${statusColor} self-start min-w-[28px] items-center`}
            >
              <Text className="text-[8px] font-semibold leading-[8px] text-center">
                {statusLabel}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center pt-3 border-t border-border">
            <Text variant="small" className="text-muted-foreground">
              {employee.wageType === WageType.DAILY
                ? t("employee.dailyRate")
                : t("employee.hourlyRate")}
              :
            </Text>
            <Text variant="small" className="font-semibold text-primary ml-1.5">
              {formatCurrency(employee.wageRate)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const EmployeeCard = memo(EmployeeCardComponent);