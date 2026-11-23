import React from 'react';
import {ViewStyle} from 'react-native';
import {TouchableOpacity} from './TouchableOpacity';
import {useTheme} from '@/theme';
import {AppIcon, IconName} from './AppIcon';

interface FabProps {
  onPress: () => void;
  icon?: IconName;
  style?: ViewStyle;
}

export function Fab({onPress, icon = 'plus-circle', style}: FabProps) {
  const {colors, shadows, radius} = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        {
          position: 'absolute',
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: radius.full,
          backgroundColor: colors.action,
          alignItems: 'center',
          justifyContent: 'center' },
        shadows.primary,
        style,
      ]}>
      <AppIcon name={icon} size={28} color={colors.white} />
    </TouchableOpacity>
  );
}

export default Fab;
