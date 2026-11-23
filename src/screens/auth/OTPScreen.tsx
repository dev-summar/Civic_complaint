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
import {useAuthStore} from '@/store/authStore';
import {formatPhone} from '@/utils/format';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

export default function OTPScreen({navigation, route}: Props) {
  const {colors, spacing} = useTheme();
  const {phone} = route.params;
  const [otp, setOtp] = useState('');
  const verifyOtp = useAuthStore(s => s.verifyOtp);
  const isLoading = useAuthStore(s => s.isLoading);
  const error = useAuthStore(s => s.error);

  const submit = async () => {
    if (otp.length < 4) {
      Alert.alert('Validation', 'Enter the OTP sent to your phone.');
      return;
    }
    try {
      await verifyOtp(phone, otp);
    } catch {
      // error in store
    }
  };

  return (
    <Screen frame="narrow">
      <Header title="Verify OTP" onBack={() => navigation.goBack()} />
      <LoadingOverlay visible={isLoading} message="Verifying…" />
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
            <AppIcon name="shield" size={28} color={colors.white} />
          </View>
          <Text variant="display" color={colors.text}>
            Verify OTP
          </Text>
          <Text variant="body" secondary style={{marginTop: spacing.sm, marginBottom: spacing.xxl}}>
            Enter the OTP sent to {formatPhone(phone)}
          </Text>
        </View>

        {error ? (
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
        ) : null}

        <Card elevated>
          <Input
            label="OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            leftIcon={<AppIcon name="lock" size={20} color={colors.textMuted} />}
            containerStyle={{marginBottom: spacing.lg}}
          />
          <Button title="Verify & Login" onPress={submit} loading={isLoading} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
