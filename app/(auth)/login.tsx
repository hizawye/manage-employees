import { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
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

const loginSchema = z.object({
  username: z.string().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { login, continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setError('');
      await login(data.username, data.password);
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
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Card>
          <CardContent className="py-6">
            <View className="items-center mb-6">
              <MaterialCommunityIcons name="account-group" size={48} className="text-primary" />
              <Text variant="h2" className="mt-4">{t('auth.login')}</Text>
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
                  className="mb-6"
                />
              )}
            />

            <Button
              onPress={handleSubmit(onSubmit)}
              isLoading={loading}
              disabled={loading}
              className="w-full mb-4"
            >
              {t('auth.login')}
            </Button>

            <View className="flex-row justify-center items-center mb-4">
              <Text variant="muted">{t('auth.dontHaveAccount')} </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text className="text-primary font-semibold">{t('auth.signupLink')}</Text>
                </Pressable>
              </Link>
            </View>

            <View className="border-t border-border pt-4">
              <Button
                variant="ghost"
                onPress={handleGuestLogin}
                isLoading={guestLoading}
                disabled={loading || guestLoading}
                className="w-full"
              >
                {t('auth.continueAsGuest')}
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>

      {error ? (
        <View className="absolute bottom-6 left-6 right-6 bg-destructive px-4 py-3 rounded-lg">
          <Text className="text-destructive-foreground text-sm">{error}</Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
