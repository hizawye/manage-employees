import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { t } from '../../src/i18n';
import { Text } from '../../src/components/ui/text';
import { Input } from '../../src/components/ui/input';
import { Button } from '../../src/components/ui/button';
import { Card, CardContent } from '../../src/components/ui/card';

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
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupFormData) => {
    try {
      setLoading(true);
      setError('');
      await signup(data.username, data.password);
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
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-8"
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <CardContent className="py-6">
            <View className="items-center mb-6">
              <MaterialCommunityIcons name="account-plus" size={48} className="text-primary" />
              <Text variant="h2" className="mt-4">{t('auth.signup')}</Text>
            </View>

            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder={t('auth.username')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  iconLeft={<MaterialCommunityIcons name="account" size={20} className="text-muted-foreground" />}
                  error={errors.username ? t(errors.username.message || '') : undefined}
                  className="mb-4"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder={t('auth.password')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  iconLeft={<MaterialCommunityIcons name="lock" size={20} className="text-muted-foreground" />}
                  iconRight={
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        className="text-muted-foreground"
                      />
                    </Pressable>
                  }
                  error={errors.password ? t(errors.password.message || '') : undefined}
                  className="mb-4"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  placeholder={t('auth.confirmPassword')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  iconLeft={<MaterialCommunityIcons name="lock-check" size={20} className="text-muted-foreground" />}
                  iconRight={
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <MaterialCommunityIcons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        className="text-muted-foreground"
                      />
                    </Pressable>
                  }
                  error={errors.confirmPassword ? t(errors.confirmPassword.message || '') : undefined}
                  className="mb-6"
                />
              )}
            />

            <Text variant="muted" className="mb-4 text-center">
              {t('auth.passwordTooShort')} · {t('auth.passwordNoNumber')}
            </Text>

            <Button
              onPress={handleSubmit(onSubmit)}
              isLoading={loading}
              disabled={loading}
              className="w-full mb-4"
            >
              {t('auth.signup')}
            </Button>

            <View className="flex-row justify-center items-center">
              <Text variant="muted">{t('auth.alreadyHaveAccount')} </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text className="text-primary font-semibold">{t('auth.loginLink')}</Text>
                </Pressable>
              </Link>
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      {error ? (
        <View className="absolute bottom-6 left-6 right-6 bg-destructive px-4 py-3 rounded-lg">
          <Text className="text-destructive-foreground text-sm">{error}</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
