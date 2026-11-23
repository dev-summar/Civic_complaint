import React from 'react';
import {Text as RNText, TextProps as RNTextProps, StyleSheet} from 'react-native';
import {useTheme} from '@/theme';
import {typography} from '@/theme/typography';

type Variant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  secondary?: boolean;
  center?: boolean;
}

export function Text({
  variant = 'body',
  color,
  muted,
  secondary,
  center,
  style,
  children,
  ...rest
}: TextProps) {
  const {colors} = useTheme();
  const resolved =
    color ??
    (muted ? colors.textMuted : secondary ? colors.textSecondary : colors.text);

  return (
    <RNText
      style={[
        typography[variant],
        {color: resolved},
        center && styles.center,
        style,
      ]}
      {...rest}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: {textAlign: 'center'},
});

export default Text;
