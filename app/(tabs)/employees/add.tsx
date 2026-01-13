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

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  role: z.string().min(1, 'Role is required'),
  wageType: z.nativeEnum(WageType),
  wageRate: z.string().min(1, 'Wage rate is required').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Must be a positive number'
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
      Alert.alert('Error', 'Failed to add employee. Please try again.');
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
              label="Name"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.name}
            />
            {errors.name && (
              <HelperText type="error">{errors.name.message}</HelperText>
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
              label="Phone"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              error={!!errors.phone}
            />
            {errors.phone && (
              <HelperText type="error">{errors.phone.message}</HelperText>
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
              label="Role / Position"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={!!errors.role}
            />
            {errors.role && (
              <HelperText type="error">{errors.role.message}</HelperText>
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
              Wage Type
            </Text>
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                { value: WageType.DAILY, label: 'Daily Rate' },
                { value: WageType.HOURLY, label: 'Hourly Rate' },
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
              label={wageType === WageType.DAILY ? 'Daily Rate ($)' : 'Hourly Rate ($)'}
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
              error={!!errors.wageRate}
            />
            {errors.wageRate && (
              <HelperText type="error">{errors.wageRate.message}</HelperText>
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
              label="Notes (optional)"
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
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Add Employee
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
