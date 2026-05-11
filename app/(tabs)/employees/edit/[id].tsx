import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Button,
  SegmentedButtons,
  Text,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployee, useEmployees } from '../../../../src/hooks';
import { WageType, EmployeeStatus } from '../../../../src/models';
import { sizes } from '../../../../src/constants/theme';
import { t } from '../../../../src/i18n';
import { FormInput } from '../../../../src/components';

// Zod schema moved outside component for performance
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
  const { colors } = useTheme();
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
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
          <View style={styles.inputContainer}>
            <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
              {t('employee.status')}
            </Text>
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: EmployeeStatus.ACTIVE, label: t('employee.active') },
                { value: EmployeeStatus.INACTIVE, label: t('employee.inactive') },
              ]}
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="wageType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <Text variant="labelLarge" style={[styles.label, { color: colors.onSurfaceVariant }]}>
              {t('employee.wageType')}
            </Text>
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: WageType.DAILY, label: t('employee.dailyRate') },
                { value: WageType.HOURLY, label: t('employee.hourlyRate') },
              ]}
            />
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

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {t('common.cancel')}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          disabled={saving}
          style={[styles.button, { backgroundColor: colors.primary }]}
          contentStyle={styles.buttonContent}
        >
          {t('employee.saveChanges')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: sizes.padding,
    paddingBottom: sizes.paddingLarge,
  },
  inputContainer: {
    marginBottom: sizes.padding,
  },
  label: {
    marginBottom: sizes.paddingSmall,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: sizes.paddingLarge,
    gap: sizes.paddingSmall,
  },
  button: {
    flex: 1,
    borderRadius: sizes.borderRadius,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
