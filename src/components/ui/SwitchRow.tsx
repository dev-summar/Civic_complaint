import React from 'react';
import {View, Switch, StyleSheet} from 'react-native';
import {useTheme} from '@/theme';
import {Text} from './Text';

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({label, description, value, onValueChange}: SwitchRowProps) {
  const {colors, spacing} = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}>
      <View style={{flex: 1, marginRight: spacing.md}}>
        <Text variant="body">{label}</Text>
        {description ? (
          <Text variant="caption" secondary style={{marginTop: 2}}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{false: colors.border, true: `${colors.primary}88`}}
        thumbColor={value ? colors.primary : colors.white}
      />
    </View>
  );
}

export default SwitchRow;
