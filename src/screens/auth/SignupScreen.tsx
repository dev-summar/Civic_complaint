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

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const signup = useAuthStore(s => s.signup);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return;
    }
    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      });
    } catch {
      // handled by store
    }
  };

  return (
    <Screen scroll frame="narrow" contentStyle={{padding: spacing.xl, paddingTop: spacing.xxxl}}>
      <LoadingOverlay visible={isLoading} message="Creating account…" />

      <Animate from="up">
        <BrandWordmark size="lg" style={{marginBottom: spacing.lg}} />
        <Text variant="display" color={colors.text}>
          {t('signup')}
        </Text>
        <Text variant="body" secondary style={{marginTop: spacing.sm, marginBottom: spacing.xxl}}>
          Create your citizen account
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
            label="Full Name"
            value={name}
            onChangeText={setName}
            leftIcon={<AppIcon name="user" size={20} color={colors.textMuted} />}
            containerStyle={{marginBottom: spacing.md}}
          />
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
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<AppIcon name="phone" size={20} color={colors.textMuted} />}
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
            containerStyle={{marginBottom: spacing.lg}}
          />

          <Button title={t('signup')} onPress={handleSignup} loading={isLoading} />
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
          Already have an account?
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          hitSlop={{top: 14, bottom: 14, left: 14, right: 14}}>
          <Text variant="bodySmall" color={colors.primary} style={{fontWeight: '700'}}>
            {t('login')}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
