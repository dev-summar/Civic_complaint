import React, {useState} from 'react';
import {View, Alert} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '@/navigation/types';
import {
  Screen,
  Input,
  Button,
  LoadingOverlay,
  Text,
  Animate,
  AppIcon,
  Card,
  BrandWordmark,
} from '@/components/ui';
import {useTheme} from '@/theme';
import {useAuthStore} from '@/store/authStore';
import {t} from '@/utils/i18n';
import {BRAND} from '@/constants';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore(s => s.login);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);
  const clearError = useAuthStore(s => s.clearError);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Please enter email and password.');
      return;
    }
    clearError();
    try {
      await login({email: email.trim().toLowerCase(), password});
    } catch {
      // error shown via store
    }
  };

  return (
    <Screen scroll frame="narrow" contentStyle={{padding: spacing.xl, paddingTop: spacing.xxxl}}>
      <LoadingOverlay visible={isLoading} message="Signing in…" />

      <Animate from="up">
        <BrandWordmark size="lg" style={{marginBottom: spacing.lg}} />
        <Text variant="display" color={colors.text}>
          {t('login')}
        </Text>
        <Text variant="body" secondary style={{marginTop: spacing.sm, marginBottom: spacing.xxl}}>
          {BRAND.tagline}
        </Text>
      </Animate>

      {error ? (
        <Animate from="fade">
          <View
            style={{
              backgroundColor: colors.dangerSoft,
              padding: spacing.md,
              borderRadius: 14,
              marginBottom: spacing.lg,
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
            }}>
            <AppIcon name="alert-triangle" size={20} color={colors.error} />
            <Text variant="bodySmall" color={colors.error} style={{flex: 1}}>
              {error}
            </Text>
          </View>
        </Animate>
      ) : null}

      <Animate from="up" delay={80}>
        <Card elevated>
          <Input
            label={t('email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<AppIcon name="mail" size={20} color={colors.textMuted} />}
            containerStyle={{marginBottom: spacing.md}}
          />
          <Input
            label={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            leftIcon={<AppIcon name="lock" size={20} color={colors.textMuted} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                <AppIcon
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            }
            containerStyle={{marginBottom: spacing.sm}}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Text
              variant="bodySmall"
              color={colors.primary}
              style={{fontWeight: '600', marginBottom: spacing.lg, alignSelf: 'flex-end'}}>
              {t('forgotPassword')}
            </Text>
          </TouchableOpacity>

          <Button title={t('login')} onPress={handleLogin} loading={isLoading} />
          <Button
            title="Login with Phone"
            variant="secondary"
            onPress={() => navigation.navigate('PhoneLogin')}
            style={{marginTop: spacing.md}}
            icon={<AppIcon name="phone" size={20} color={colors.primary} />}
          />
        </Card>
      </Animate>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.xs,
          marginTop: spacing.xl,
        }}>
        <Text variant="bodySmall" secondary>
          Don't have an account?
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Signup')}
          hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}>
          <Text variant="bodySmall" color={colors.primary} style={{fontWeight: '700'}}>
            {t('signup')}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
