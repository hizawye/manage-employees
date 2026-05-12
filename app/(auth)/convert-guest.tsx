import { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
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
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!isGuest) {
      router.replace('/(tabs)/profile');
    }
  }, [isGuest, router]);

  if (!isGuest) return null;

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
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Card>
          <CardContent className="py-6">
            <View className="items-center mb-6">
              <MaterialCommunityIcons name="account-convert" size={48} className="text-primary" />
              <Text variant="h2" className="mt-4">{t('auth.createAccount')}</Text>
              <Text variant="muted" className="text-center mt-2">
                {t('auth.saveDataPermanently')}
              </Text>
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

            <Button
              onPress={handleSubmit(onSubmit)}
              isLoading={loading}
              disabled={loading}
              className="w-full mb-4"
            >
              {t('auth.convertGuest')}
            </Button>

            <Button
              variant="ghost"
              onPress={() => router.dismissAll()}
              disabled={loading}
              className="w-full"
            >
              {t('common.cancel')}
            </Button>
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
