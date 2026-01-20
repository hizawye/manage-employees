import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, I18nManager } from 'react-native';
import {
  Button,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployees } from '../../../src/hooks';
import { WageType, EmployeeStatus } from '../../../src/models';
import { colors, sizes } from '../../../src/constants/theme';
import { toISODateString } from '../../../src/utils/dateUtils';
import { t } from '../../../src/i18n';
import { FormInput } from '../../../src/components';

const isRTL = I18nManager.isRTL;

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
  notes: z.string().optional(),
});

type FormData = z.infer<typeof employeeSchema>;

export default function AddEmployeeScreen() {
  const router = useRouter();
  const { addEmployee } = useEmployees();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      phone: '',
      role: '',
      wageType: WageType.DAILY,
      wageRate: '',
      notes: '',
    },
  });

  const wageType = watch('wageType');

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      await addEmployee({
        name: data.name,
        phone: data.phone,
        role: data.role,
        wageType: data.wageType,
        wageRate: Number(data.wageRate),
        joinDate: toISODateString(new Date()),
        status: EmployeeStatus.ACTIVE,
        notes: data.notes,
      });
      router.back();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        name="wageType"
        render={({ field: { onChange, value } }) => (
          <View style={{ marginBottom: sizes.padding }}>
            <Text variant="titleSmall" style={styles.label}>
              {t('employee.wageType')}
            </Text>
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: WageType.DAILY, label: t('employee.dailyRate') },
                { value: WageType.HOURLY, label: t('employee.hourlyRate') },
              ]}
              style={styles.segmentedButtons}
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
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            multiline
            numberOfLines={4}
          />
        )}
      />

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {t('common.cancel')}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.primaryButton]}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {t('employee.addEmployee')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: sizes.padding,
    paddingBottom: sizes.paddingLarge,
  },
  label: {
    marginBottom: sizes.paddingSmall,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentedButtons: {
    borderRadius: sizes.borderRadius,
    marginBottom: sizes.padding,
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
  primaryButton: {
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
