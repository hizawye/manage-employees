import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  HelperText,
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
          <View style={styles.inputContainer}>
            <TextInput
              label={t('employee.name')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.name}
            />
            {errors.name && (
              <HelperText type="error">{t(errors.name.message || 'validation.required')}</HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label={t('employee.phone')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              error={!!errors.phone}
            />
            {errors.phone && (
              <HelperText type="error">{t(errors.phone.message || 'validation.required')}</HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label={t('employee.role')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.role}
            />
            {errors.role && (
              <HelperText type="error">{t(errors.role.message || 'validation.required')}</HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="wageType"
        render={({ field: { onChange, value } }) => (
          <View style={styles.inputContainer}>
            <Text variant="labelLarge" style={styles.label}>
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
          <View style={styles.inputContainer}>
            <TextInput
              label={wageType === WageType.DAILY ? t('employee.dailyRate') : t('employee.hourlyRate')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              error={!!errors.wageRate}
            />
            {errors.wageRate && (
              <HelperText type="error">{t(errors.wageRate.message || 'validation.required')}</HelperText>
            )}
          </View>
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <TextInput
              label={t('employee.notesOptional')}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
              numberOfLines={3}
            />
          </View>
        )}
      />

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
        >
          {t('common.cancel')}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          style={styles.button}
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
  },
  inputContainer: {
    marginBottom: sizes.padding,
  },
  label: {
    marginBottom: sizes.paddingSmall,
    color: colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: sizes.padding,
  },
  button: {
    flex: 1,
    marginHorizontal: sizes.paddingSmall / 2,
  },
});
