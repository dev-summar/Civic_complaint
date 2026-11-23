import React from 'react';
import {View} from 'react-native';
import {TouchableOpacity} from './TouchableOpacity';
import {useTheme} from '@/theme';
import {AppIcon, Text} from '@/components/ui';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Checkbox({checked, onChange, label}: CheckboxProps) {
  const {colors, spacing, radius} = useTheme();

  return (
    <TouchableOpacity
      style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}
      onPress={() => onChange(!checked)}
      activeOpacity={0.7}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center' }}>
        {checked ? <AppIcon name="check" size={14} color={colors.white} /> : null}
      </View>
      {label ? <Text variant="bodySmall">{label}</Text> : null}
    </TouchableOpacity>
  );
}

export default Checkbox;
