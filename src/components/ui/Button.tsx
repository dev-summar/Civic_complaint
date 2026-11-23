import React, {useMemo} from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import {TouchableOpacity} from './TouchableOpacity';
import {useTheme} from '@/theme';
import {Text} from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'sm' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const {colors, radius, shadows, spacing} = useTheme();
  const isDisabled = disabled || loading;

  const palette = useMemo(() => {
    switch (variant) {
      case 'secondary':
        return {
          bg: colors.surface,
          text: colors.primary,
          border: colors.primary,
          shadow: shadows.sm,
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: colors.primary,
          border: colors.primary,
          shadow: undefined,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: colors.primary,
          border: undefined,
          shadow: undefined,
        };
      case 'danger':
        return {
          bg: colors.error,
          text: colors.white,
          border: undefined,
          shadow: shadows.sm,
        };
      default:
        return {
          bg: colors.action,
          text: colors.white,
          border: undefined,
          shadow: shadows.primary,
        };
    }
  }, [variant, colors, shadows]);

  const padV = size === 'sm' ? spacing.sm : size === 'lg' ? spacing.lg : spacing.md;
  const minH = size === 'sm' ? 40 : size === 'lg' ? 56 : 50;

  return (
    <View style={style}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{disabled: isDisabled, busy: loading}}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={isDisabled}
        style={[
          styles.base,
          {
            backgroundColor: palette.bg,
            borderRadius: radius.md,
            minHeight: minH,
            paddingVertical: padV,
            paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
            borderWidth: palette.border ? 1.5 : 0,
            borderColor: palette.border,
            opacity: isDisabled ? 0.5 : 1,
            width: '100%',
          },
          palette.shadow,
          Platform.OS === 'android' && variant === 'primary' ? {elevation: 3} : null,
        ]}>
        {loading ? (
          <ActivityIndicator color={palette.text} />
        ) : (
          <>
            {icon}
            <Text variant="button" style={[{color: palette.text, flexShrink: 1, textAlign: 'center'}, textStyle]}>
              {title}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default Button;
