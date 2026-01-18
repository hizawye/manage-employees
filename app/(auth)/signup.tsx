import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../src/auth/useAuth';
import { t } from '../../src/i18n';
import { colors, sizes } from '../../src/constants/theme';

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'auth.usernameTooShort')
    .max(20, 'auth.usernameTooLong')
    .regex(/^[a-zA-Z0-9_]+$/, 'auth.usernameInvalid'),
  password: z
    .string()
    .min(8, 'auth.passwordTooShort')
    .regex(/\d/, 'auth.passwordNoNumber'),
  confirmPassword: z.string().min(1, 'validation.required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.passwordsDontMatch',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setLoading(true);
      setError('');
      await signup(data.username, data.password);
      router.replace('/(tabs)/employees');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        setError(t('auth.usernameExists'));
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.formSurface} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('auth.signup')}
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
            style={styles.signupButton}
          >
            {loading ? t('auth.signingUp') : t('auth.signup')}
          </Button>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
            <Link href="/(auth)/login" asChild>
              <Text style={styles.loginLink}>{t('auth.loginLink')}</Text>
            </Link>
          </View>
        </Surface>
      </ScrollView>

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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: sizes.paddingLarge,
    paddingVertical: sizes.paddingLarge,
  },
  formSurface: {
    padding: sizes.paddingLarge,
    borderRadius: sizes.borderRadiusLarge,
    backgroundColor: colors.surface,
  },
  title: {
    marginBottom: sizes.paddingLarge,
    textAlign: 'center',
    fontWeight: 'bold',
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
  signupButton: {
    marginTop: sizes.padding,
    marginBottom: sizes.paddingLarge,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
