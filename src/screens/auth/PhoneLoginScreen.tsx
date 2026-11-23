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

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneLogin'>;

export default function PhoneLoginScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      Alert.alert('Validation', 'Enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      await authService.phoneLogin(cleaned);
      navigation.navigate('OTP', {phone: cleaned});
    } catch {
      Alert.alert('Error', 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen frame="narrow">
      <Header title="Phone Login" onBack={() => navigation.goBack()} />
      <LoadingOverlay visible={loading} message="Sending OTP…" />
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
            <AppIcon name="phone" size={28} color={colors.white} />
          </View>
          <Text variant="display" color={colors.text}>
            Phone login
          </Text>
          <Text variant="body" secondary style={{marginTop: spacing.sm, marginBottom: spacing.xxl}}>
            We'll send a one-time password to your mobile.
          </Text>
        </View>

        <Card elevated>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 XXXXX XXXXX"
            leftIcon={<AppIcon name="phone" size={20} color={colors.textMuted} />}
            containerStyle={{marginBottom: spacing.lg}}
          />
          <Button title="Send OTP" onPress={submit} loading={loading} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
