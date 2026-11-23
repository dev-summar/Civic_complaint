import {useEffect, useState} from 'react';
import {AccessibilityInfo, Platform} from 'react-native';

/** Shared motion timings — keep press/entrance ≤300ms. */
export const MOTION = {
  press: 150,
  entrance: 280,
  chip: 120,
  stagger: 40,
  toast: 3000,
  trailPulse: 2000,
} as const;

export function getPrefersReducedMotionSync(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

/** Subscribe to OS / browser reduced-motion preference. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getPrefersReducedMotionSync);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => setReduced(mq.matches);
      onChange();
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    }

    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then(v => {
      if (mounted) setReduced(!!v);
    });
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (v: boolean) => setReduced(!!v),
    );
    return () => {
      mounted = false;
      if (sub && typeof (sub as {remove?: () => void}).remove === 'function') {
        (sub as {remove: () => void}).remove();
      }
    };
  }, []);

  return reduced;
}
