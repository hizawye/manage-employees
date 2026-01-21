import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Snackbar, useTheme } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../src/auth/useAuth';
import { t } from '../../src/i18n';
import { sizes } from '../../src/constants/theme';

const loginSchema = z.object({
  username: z.string().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login, continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setError('');
      await login(data.username, data.password);
      router.replace('/(tabs)/employees');
    } catch (err: any) {
      setError(err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setGuestLoading(true);
      setError('');
      await continueAsGuest();
      router.replace('/(tabs)/employees');
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Surface style={styles.formSurface} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('auth.login')}
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
            <Text style={[styles.errorText, { color: colors.error }]}>{t(errors.username.message || '')}</Text>
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
            <Text style={[styles.errorText, { color: colors.error }]}>{t(errors.password.message || '')}</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          >
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </Button>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{t('auth.dontHaveAccount')} </Text>
            <Link href="/(auth)/signup" asChild>
              <Text style={[styles.signupLink, { color: colors.primary }]}>{t('auth.signupLink')}</Text>
            </Link>
          </View>

          <Button
            mode="text"
            onPress={handleGuestLogin}
            loading={guestLoading}
            disabled={loading || guestLoading}
            style={styles.guestButton}
          >
            {t('auth.continueAsGuest')}
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: sizes.paddingLarge,
  },
  formSurface: {
    padding: sizes.paddingLarge,
    borderRadius: sizes.borderRadiusLarge,
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
    fontSize: 12,
    marginBottom: sizes.padding,
    marginTop: -4,
  },
  loginButton: {
    marginTop: sizes.padding,
    marginBottom: sizes.paddingLarge,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  guestButton: {
    marginTop: sizes.padding,
  },
});
