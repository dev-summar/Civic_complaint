import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AuthStackParamList} from './types';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import SignupScreen from '@/screens/auth/SignupScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import PhoneLoginScreen from '@/screens/auth/PhoneLoginScreen';
import OTPScreen from '@/screens/auth/OTPScreen';
import {useAppStore} from '@/store/appStore';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const initialDone = React.useRef(useAppStore.getState().onboardingComplete).current;

  return (
    <Stack.Navigator
      initialRouteName={initialDone ? 'Login' : 'Onboarding'}
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
  );
}

export default AuthNavigator;
