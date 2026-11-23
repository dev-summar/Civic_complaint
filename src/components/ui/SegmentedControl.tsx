import React from 'react';
import {View} from 'react-native';
import {Pressable} from 'react-native-gesture-handler';
import {useTheme} from '@/theme';
import {Text} from './Text';

interface SegmentedControlProps {
  options: {label: string; value: string}[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({
  options,
  value,
  onChange }: SegmentedControlProps) {
  const {colors, spacing, radius, shadows} = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.primarySoft,
        borderRadius: radius.md,
        padding: 4 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{selected: active}}
            onPress={() => onChange(opt.value)}
            style={({pressed}) => [
              {
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                paddingVertical: spacing.sm + 2,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
                borderRadius: radius.sm },
              active
                ? {
                    backgroundColor: colors.surface,
                    ...shadows.sm }
                : null,
            ]}>
            <Text
              variant="bodySmall"
              color={active ? colors.primary : colors.textSecondary}
              style={{fontWeight: active ? '700' : '500'}}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default SegmentedControl;
