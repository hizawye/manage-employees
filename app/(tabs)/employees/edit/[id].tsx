import { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployee, useEmployees } from '../../../../src/hooks';
import { WageType, EmployeeStatus } from '../../../../src/models';
import { t } from '../../../../src/i18n';
import { FormInput } from '../../../../src/components';
import { Text } from '../../../../src/components/ui/text';
import { Button } from '../../../../src/components/ui/button';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const employeeSchema = z.object({
  name: z.string().min(1, 'validation.nameRequired'),
  phone: z.string().min(1, 'validation.phoneRequired'),
  role: z.string().min(1, 'validation.roleRequired'),
  wageType: z.nativeEnum(WageType),
  wageRate: z.string().min(1, 'validation.wageRateRequired').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'validation.invalidNumber'
  ),
  status: z.nativeEnum(EmployeeStatus),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof employeeSchema>;

export default function EditEmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { employee, loading: loadingEmployee } = useEmployee(id);
  const { editEmployee } = useEmployees();
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      phone: '',
      role: '',
      wageType: WageType.DAILY,
      wageRate: '',
      status: EmployeeStatus.ACTIVE,
      notes: '',
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        phone: employee.phone,
        role: employee.role,
        wageType: employee.wageType,
        wageRate: employee.wageRate.toString(),
        status: employee.status,
        notes: employee.notes || '',
      });
    }
  }, [employee, reset]);

  const wageType = watch('wageType');

  const onSubmit = async (data: FormData) => {
    if (!id) return;

    try {
      setSaving(true);
      await editEmployee(id, {
        name: data.name,
        phone: data.phone,
        role: data.role,
        wageType: data.wageType,
        wageRate: Number(data.wageRate),
        status: data.status,
        notes: data.notes,
      });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.error');
      Alert.alert(t('common.error'), message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingEmployee) {
    return (
      <View className="flex-1 justify-center items-center">
        <MaterialCommunityIcons name="loading" size={32} className="text-primary" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label={t('employee.name')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.name}
            errorMessage={errors.name?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label={t('employee.phone')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="phone-pad"
            error={!!errors.phone}
            errorMessage={errors.phone?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label={t('employee.role')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={!!errors.role}
            errorMessage={errors.role?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <Text variant="label" className="mb-2 text-foreground">
              {t('employee.status')}
            </Text>
            <View className="flex-row rounded-lg border border-border bg-background overflow-hidden">
              {([EmployeeStatus.ACTIVE, EmployeeStatus.INACTIVE] as EmployeeStatus[]).map((status) => (
                <Pressable
                  key={status}
                  onPress={() => onChange(status)}
                  className={`flex-1 py-3 items-center justify-center ${
                    value === status ? 'bg-primary' : 'bg-background'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === status ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {status === EmployeeStatus.ACTIVE ? t('employee.active') : t('employee.inactive')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="wageType"
        render={({ field: { onChange, value } }) => (
          <View className="mb-4">
            <Text variant="label" className="mb-2 text-foreground">
              {t('employee.wageType')}
            </Text>
            <View className="flex-row rounded-lg border border-border bg-background overflow-hidden">
              {([WageType.DAILY, WageType.HOURLY] as WageType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => onChange(type)}
                  className={`flex-1 py-3 items-center justify-center ${
                    value === type ? 'bg-primary' : 'bg-background'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      value === type ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {type === WageType.DAILY ? t('employee.dailyRate') : t('employee.hourlyRate')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      />

      <Controller
        control={control}
        name="wageRate"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label={wageType === WageType.DAILY ? t('employee.dailyRate') : t('employee.hourlyRate')}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            error={!!errors.wageRate}
            errorMessage={errors.wageRate?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormInput
            label={t('employee.notesOptional')}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={3}
          />
        )}
      />

      <View className="flex-row gap-3 mt-6">
        <Button variant="outline" className="flex-1" onPress={() => router.back()}>
          {t('common.cancel')}
        </Button>
        <Button className="flex-1" onPress={handleSubmit(onSubmit)} isLoading={saving}>
          {t('employee.saveChanges')}
        </Button>
      </View>
    </ScrollView>
  );
}
