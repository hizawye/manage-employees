import { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../src/auth/useAuth';
import { t } from '../../src/i18n';
import { colors, sizes } from '../../src/constants/theme';

const convertGuestSchema = z.object({
  username: z.string().min(3, 'auth.usernameTooShort').max(20, 'auth.usernameTooLong'),
  password: z.string().min(8, 'auth.passwordTooShort'),
  confirmPassword: z.string().min(8, 'auth.passwordTooShort'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.passwordsDontMatch',
  path: ['confirmPassword'],
});

type ConvertGuestFormData = z.infer<typeof convertGuestSchema>;

export default function ConvertGuestScreen() {
  const router = useRouter();
  const { convertGuestToUser, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ConvertGuestFormData>({
    resolver: zodResolver(convertGuestSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect if not guest (use useEffect to avoid setState during render)
  useEffect(() => {
    if (!isGuest) {
      router.replace('/(tabs)/profile');
    }
  }, [isGuest, router]);

  // Show nothing while redirecting
  if (!isGuest) {
    return null;
  }

  const onSubmit = async (data: ConvertGuestFormData) => {
    try {
      setLoading(true);
      setError('');
      await convertGuestToUser(data.username, data.password);
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Surface style={styles.formSurface} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('auth.createAccount')}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('auth.saveDataPermanently')}
          </Text>

          <Controller
            control={control}
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                label={t('auth.username')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.username}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                disabled={loading}
              />
            )}
          />
          {errors.username && (
            <Text style={styles.errorText}>{t(errors.username.message || '')}</Text>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                label={t('auth.password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.password}
                style={styles.input}
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                disabled={loading}
              />
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>{t(errors.password.message || '')}</Text>
          )}

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                label={t('auth.confirmPassword')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.confirmPassword}
                style={styles.input}
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                disabled={loading}
              />
            )}
          />
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{t(errors.confirmPassword.message || '')}</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.convertButton}
          >
            {loading ? t('auth.convertingGuest') : t('auth.convertGuest')}
          </Button>

          <Button
            mode="text"
            onPress={() => router.back()}
            disabled={loading}
            style={styles.cancelButton}
          >
            {t('common.cancel')}
          </Button>
        </Surface>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        action={{
          label: t('common.ok'),
          onPress: () => setError(''),
        }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: sizes.paddingLarge,
  },
  formSurface: {
    padding: sizes.paddingLarge,
    borderRadius: sizes.borderRadiusLarge,
    backgroundColor: colors.surface,
  },
  title: {
    marginBottom: sizes.paddingSmall,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: sizes.paddingLarge,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  input: {
    marginBottom: sizes.paddingSmall,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: sizes.padding,
    marginTop: -4,
  },
  convertButton: {
    marginTop: sizes.padding,
    marginBottom: sizes.paddingSmall,
  },
  cancelButton: {
    marginTop: sizes.paddingSmall,
  },
});
