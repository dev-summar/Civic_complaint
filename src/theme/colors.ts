/**
 * SwachhSetu design tokens
 * Shared with admin: brand green #0F3D3A, #E5E7EB borders, status palette.
 * Citizen keeps amber action for primary CTAs.
 */

export const lightColors = {
  primary: '#0F3D3A',
  primaryDark: '#0A2E2C',
  primaryLight: '#1B5C58',
  secondary: '#1B5C58',
  action: '#FF7A1A',
  accent: '#FF7A1A',
  background: '#F7F8F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  neutral500: '#6B7280',
  border: '#E5E7EB',
  divider: '#E5E7EB',
  error: '#B91C1C',
  success: '#15803D',
  warning: '#D97706',
  info: '#2563EB',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(17, 24, 39, 0.45)',
  inputBg: '#FFFFFF',
  tabBar: 'rgba(255, 255, 255, 0.96)',
  dangerSoft: '#FEF2F2',
  successSoft: '#ECFDF5',
  warningSoft: '#FFFBEB',
  primarySoft: '#E6F0EC',
  actionSoft: 'rgba(255, 122, 26, 0.12)',
  /** Trail / workflow — align with admin status colors */
  status: {
    draft: '#6B7280',
    submitted: '#D97706',
    acknowledged: '#D97706',
    assigned: '#2563EB',
    in_progress: '#2563EB',
    resolved: '#15803D',
    rejected: '#B91C1C',
    escalated: '#D97706',
    closed: '#15803D',
  },
  priority: {
    low: '#15803D',
    medium: '#D97706',
    high: '#FF7A1A',
    critical: '#B91C1C',
  },
} as const;

export const darkColors: typeof lightColors = {
  primary: '#3D8A86',
  primaryDark: '#2A6A66',
  primaryLight: '#4FA09A',
  secondary: '#4FA09A',
  action: '#FF8F3D',
  accent: '#FF8F3D',
  background: '#0C1414',
  surface: '#15201F',
  surfaceElevated: '#1C2A29',
  text: '#F6F7F5',
  textSecondary: '#A3AAA7',
  textMuted: '#8A928F',
  neutral500: '#8A928F',
  border: '#243332',
  divider: '#2E3D3C',
  error: '#E57373',
  success: '#4CAF7A',
  warning: '#F0C040',
  info: '#6B9FFF',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  inputBg: '#1C2A29',
  tabBar: 'rgba(21, 32, 31, 0.96)',
  dangerSoft: '#3A1F1F',
  successSoft: '#1A3326',
  warningSoft: '#3A3210',
  primarySoft: 'rgba(61, 138, 134, 0.16)',
  actionSoft: 'rgba(255, 143, 61, 0.16)',
  status: {
    draft: '#8A928F',
    submitted: '#F0C040',
    acknowledged: '#F0C040',
    assigned: '#6B9FFF',
    in_progress: '#6B9FFF',
    resolved: '#4CAF7A',
    rejected: '#E57373',
    escalated: '#FF8F3D',
    closed: '#4CAF7A',
  },
  priority: {
    low: '#4CAF7A',
    medium: '#F0C040',
    high: '#FF8F3D',
    critical: '#E57373',
  },
};

/** @deprecated Prefer useTheme().colors */
export const colors = lightColors;

/** CSS custom-property mirror for web */
export const cssVariables = `
:root {
  --color-primary: #0F3D3A;
  --color-primary-light: #1B5C58;
  --color-action: #FF7A1A;
  --color-success: #15803D;
  --color-warning: #D97706;
  --color-info: #2563EB;
  --color-neutral-500: #6B7280;
  --color-bg: #F7F8F7;
  --color-surface: #FFFFFF;
  --color-text: #111827;
  --color-border: #E5E7EB;
  --radius-card: 10px;
  --radius-button: 8px;
  --radius-full: 9999px;
  --shadow-card: 0 1px 2px rgba(17, 24, 39, 0.04);
  --font-display: 'Inter', 'Noto Sans Devanagari', 'Noto Sans Arabic', system-ui, sans-serif;
  --font-body: 'Inter', 'Noto Sans Devanagari', 'Noto Naskh Arabic', 'Noto Sans Arabic', system-ui, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, monospace;
}
.font-display { font-family: var(--font-display); }
.font-body { font-family: var(--font-body); }
.font-mono { font-family: var(--font-mono); }
`;
