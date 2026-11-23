import React from 'react';
import {View, ViewStyle} from 'react-native';
import {useTheme} from '@/theme';
import {Text} from './Text';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  color?: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({label, color, variant = 'default', style}: BadgeProps) {
  const {colors, spacing, radius, isDark} = useTheme();

  const soft = {
    default: {bg: isDark ? colors.border : '#F1F5F9', text: colors.textSecondary},
    success: {bg: colors.successSoft, text: colors.success},
    warning: {bg: colors.warningSoft, text: colors.warning},
    error: {bg: colors.dangerSoft, text: colors.error},
    info: {bg: colors.primarySoft, text: colors.info},
  }[variant];

  const bg = color ? `${color}22` : soft.bg;
  const textColor = color ?? soft.text;

  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs,
          borderRadius: radius.full,
          alignSelf: 'flex-start',
          backgroundColor: bg,
        },
        style,
      ]}>
      <Text variant="caption" color={textColor} style={{fontWeight: '600'}}>
        {label}
      </Text>
    </View>
  );
}

export default Badge;
