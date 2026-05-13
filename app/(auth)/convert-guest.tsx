import { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/useAuth';
import { t } from '../../src/i18n';
import { Text } from '../../src/components/ui/text';
import { Button } from '../../src/components/ui/button';
import { cn } from '../../src/lib/utils';

const convertGuestSchema = z.object({
  username: z.string().min(3, 'auth.usernameTooShort').max(20, 'auth.usernameTooLong'),
  password: z.string().min(8, 'auth.passwordTooShort'),
  confirmPassword: z.string().min(8, 'auth.passwordTooShort'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.passwordsDontMatch',
  path: ['confirmPassword'],
});

type ConvertGuestFormData = z.infer<typeof convertGuestSchema>;

function AuthInput({
  label,
  error,
  iconLeft,
  iconRight,
  secureTextEntry,
  editable,
  ...rest
}: {
  label: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  secureTextEntry?: boolean;
  editable?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-muted-foreground mb-1.5">{label}</Text>
      <View
        className={cn(
          'flex-row items-center h-12 rounded-lg border bg-background px-3',
          error ? 'border-destructive' : 'border-border'
        )}
      >
        {iconLeft && <View className="mr-2">{iconLeft}</View>}
        <TextInput
          className="flex-1 text-base text-foreground"
          placeholderTextColor="hsl(215 16% 47%)"
          secureTextEntry={secureTextEntry}
          editable={editable}
          {...rest}
        />
        {iconRight && <View className="ml-2">{iconRight}</View>}
      </View>
      {error ? <Text className="text-sm text-destructive mt-1">{error}</Text> : null}
    </View>
  );
}

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
        <View className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <View className="p-6">
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
                <AuthInput
                  label={t('auth.username')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  iconLeft={<MaterialCommunityIcons name="account" size={20} className="text-muted-foreground" />}
                  error={errors.username ? t(errors.username.message || '') : undefined}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label={t('auth.password')}
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
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <AuthInput
                  label={t('auth.confirmPassword')}
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
          </View>
        </View>

        {error ? (
          <View className="absolute bottom-6 left-6 right-6 bg-destructive px-4 py-3 rounded-lg">
            <Text className="text-destructive-foreground text-sm">{error}</Text>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}