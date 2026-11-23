import {Platform, TextStyle} from 'react-native';

type Weight = TextStyle['fontWeight'];

/** Inter everywhere — matches admin dashboard. */
export const fonts = {
  display: Platform.select({
    web: "'Inter', 'Noto Sans Devanagari', 'Noto Sans Arabic', system-ui, sans-serif",
    default: 'System',
  }) as string,
  body: Platform.select({
    web: "'Inter', 'Noto Sans Devanagari', 'Noto Naskh Arabic', 'Noto Sans Arabic', system-ui, sans-serif",
    default: 'System',
  }) as string,
  mono: Platform.select({
    web: "'Space Mono', ui-monospace, monospace",
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
};

export const typography = {
  display: {
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '700' as Weight,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700' as Weight,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '600' as Weight,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '600' as Weight,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600' as Weight,
    lineHeight: 20,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '400' as Weight,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '400' as Weight,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '500' as Weight,
    lineHeight: 16,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: '600' as Weight,
    lineHeight: 16,
  },
  button: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '600' as Weight,
    lineHeight: 18,
  },
  /** Tabular figures for counts and ages. */
  stat: {
    fontFamily: fonts.body,
    fontSize: 24,
    fontWeight: '700' as Weight,
    lineHeight: 30,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
} as const;
