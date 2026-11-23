import React from 'react';
import {View } from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useTheme} from '@/theme';
import {Text} from '@/components/ui';
import {PRIORITY, PRIORITY_LABELS, Priority} from '@/constants/status';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

const priorities = Object.values(PRIORITY);

export function PrioritySelector({value, onChange}: PrioritySelectorProps) {
  const {colors, spacing} = useTheme();

  return (
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {priorities.map(p => {
        const active = value === p;
        const color = colors.priority[p];
        return (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: active ? color : colors.surface,
              borderWidth: active ? 0 : 1,
              borderColor: colors.border }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: active ? '#FFF' : color }}
            />
            <Text
              variant="caption"
              color={active ? '#FFF' : colors.text}
              style={{fontWeight: '700'}}>
              {PRIORITY_LABELS[p]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default PrioritySelector;
