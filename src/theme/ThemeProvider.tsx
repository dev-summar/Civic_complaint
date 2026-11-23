import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {useAppStore} from '@/store/appStore';
import {lightColors, darkColors} from './colors';
import {spacing, radius, shadows} from './spacing';
import {typography} from './typography';

type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  spacing,
  radius,
  shadows,
  typography,
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const themeMode = useAppStore(s => s.theme);
  const system = useColorScheme();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && system === 'dark');

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      spacing,
      radius,
      shadows,
      typography,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
