import React, {useState} from 'react';
import {View, Alert, ScrollView} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '@/navigation/types';
import {
  Screen,
  Header,
  Input,
  Button,
  LoadingOverlay,
  Text,
  AppIcon,
  Card,
} from '@/components/ui';
import {useTheme} from '@/theme';
import * as authService from '@/services/auth.service';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      Alert.alert('Error', 'Could not send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen frame="narrow">
      <Header title="Forgot Password" onBack={() => navigation.goBack()} />
      <LoadingOverlay visible={loading} message="Sending reset link…" />
      <ScrollView
        contentContainerStyle={{padding: spacing.xl, paddingBottom: 40}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={{marginBottom: spacing.lg}}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
            <AppIcon name="mail" size={28} color={colors.white} />
          </View>
          <Text variant="display" color={colors.text}>
            Reset password
          </Text>
          <Text variant="body" secondary style={{marginTop: spacing.sm, marginBottom: spacing.xxl}}>
            Enter your registered email. We'll send password reset instructions.
          </Text>
        </View>

        {sent ? (
          <View
            style={{
              backgroundColor: colors.successSoft,
              padding: spacing.md,
              borderRadius: 14,
              marginBottom: spacing.lg,
              flexDirection: 'row',
              gap: spacing.sm,
              alignItems: 'center',
            }}>
            <AppIcon name="check-circle" size={20} color={colors.success} />
            <Text variant="bodySmall" color={colors.success} style={{flex: 1}}>
              Reset link sent! Check your email.
            </Text>
          </View>
        ) : (
          <Card elevated>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<AppIcon name="mail" size={20} color={colors.textMuted} />}
              containerStyle={{marginBottom: spacing.lg}}
            />
            <Button title="Send Reset Link" onPress={submit} loading={loading} />
          </Card>
        )}

        <Button
          title="Back to Login"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
          style={{marginTop: spacing.xl}}
        />
      </ScrollView>
    </Screen>
  );
}
