import React from 'react';
import {View, ViewStyle} from 'react-native';
import {useTheme} from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
}

export function Card({
  children,
  style,
  padded = true,
}: CardProps) {
  const {colors, radius} = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
        },
        padded ? {padding: 18} : null,
        style,
      ]}>
      {children}
    </View>
  );
}

export default Card;
