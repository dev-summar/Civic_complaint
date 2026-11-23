import React, {useCallback, useEffect, useState} from 'react';
import {
  CommonActions,
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {BackHandler} from 'react-native';
import {useAuthStore} from '@/store/authStore';
import {ROLES} from '@/constants';
import {useTheme} from '@/theme';
import {SplashScreen} from '@/components/ui/SplashScreen';
import AuthNavigator from './AuthNavigator';
import CitizenNavigator from './CitizenNavigator';
import OfficerNavigator from './OfficerNavigator';
import WorkerNavigator from './WorkerNavigator';
import AdminNavigator from './AdminNavigator';

export const navigationRef = createNavigationContainerRef();

function RoleNavigator() {
  const user = useAuthStore(s => s.user);

  switch (user?.role) {
    case ROLES.ADMIN:
      return <AdminNavigator />;
    case ROLES.OFFICER:
      return <OfficerNavigator />;
    case ROLES.WORKER:
      return <WorkerNavigator />;
    case ROLES.CITIZEN:
    default:
      return <CitizenNavigator />;
  }
}

function handleHardwareBack() {
  if (!navigationRef.isReady()) return false;
  const state = navigationRef.getRootState();
  if (!state) return false;

  if (state.index > 0) {
    navigationRef.dispatch(CommonActions.goBack());
    return true;
  }

  const current = state.routes[state.index];
  const nested = current?.state;
  if (
    nested &&
    nested.type === 'tab' &&
    (nested.index ?? 0) > 0 &&
    nested.routes.length > 0
  ) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: current.name,
        params: {screen: nested.routes[0].name},
      }),
    );
    return true;
  }

  return false;
}

export function RootNavigator() {
  const isHydrated = useAuthStore(s => s.isHydrated);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const {colors, isDark} = useTheme();
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [splashDone]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };

  if (!splashDone) {
    return <SplashScreen ready={isHydrated} onFinish={finishSplash} />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {!isAuthenticated ? <AuthNavigator /> : <RoleNavigator />}
    </NavigationContainer>
  );
}

export default RootNavigator;
