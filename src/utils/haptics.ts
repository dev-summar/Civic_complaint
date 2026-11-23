import {Platform, Vibration} from 'react-native';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [0, 30, 50, 30],
  error: [0, 50, 100, 50],
  selection: 5,
};

export function haptic(type: HapticType = 'light'): void {
  if (Platform.OS === 'web') return;
  const pattern = patterns[type];
  Vibration.vibrate(pattern);
}

export function hapticSuccess(): void {
  haptic('success');
}

export function hapticError(): void {
  haptic('error');
}

export function hapticSelection(): void {
  haptic('selection');
}
