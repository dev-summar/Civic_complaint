import React, {useEffect, useRef} from 'react';
import {Animated, Easing, View, Platform} from 'react-native';
import {TouchableOpacity} from './TouchableOpacity';
import {useTheme} from '@/theme';
import {AppIcon, IconName} from './AppIcon';
import {Text} from './Text';
import {MOTION, useReducedMotion} from '@/utils/motion';
import {hapticSelection} from '@/utils/haptics';

interface CategoryChipProps {
  icon: IconName;
  label: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
  layout?: 'row' | 'column';
}

export function CategoryChip({
  icon,
  label,
  color,
  selected = false,
  onPress,
  layout = 'row' }: CategoryChipProps) {
  const {colors, radius} = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const prevSelected = useRef(selected);

  useEffect(() => {
    if (selected && !prevSelected.current) {
      hapticSelection();
      if (reduced) {
        scale.setValue(1.02);
      } else {
        // Pop: 1 → 1.05 → 1.02 within ~120ms window + settle
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 70,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true }),
          Animated.timing(scale, {
            toValue: 1.02,
            duration: 50,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true }),
        ]).start();
      }
    } else if (!selected) {
      Animated.timing(scale, {
        toValue: 1,
        duration: reduced ? 0 : MOTION.chip,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true }).start();
    } else {
      scale.setValue(1.02);
    }
    prevSelected.current = selected;
  }, [selected, reduced, scale]);

  const isColumn = layout === 'column';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      disabled={!onPress}>
      <Animated.View
        style={{
          transform: [{scale}],
          flexDirection: isColumn ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingVertical: isColumn ? 16 : 10,
          paddingHorizontal: 12,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.action : colors.border,
          minHeight: isColumn ? 88 : undefined,
          position: 'relative',
          ...(Platform.OS === 'web'
            ? ({
                transition: reduced
                  ? 'none'
                  : `transform ${MOTION.chip}ms ease-out, border-color ${MOTION.chip}ms ease-out` } as object)
            : null) }}>
        {selected ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.action,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2 }}>
            <AppIcon name="check" size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}

        <View
          style={{
            width: isColumn ? 44 : 36,
            height: isColumn ? 44 : 36,
            borderRadius: radius.full,
            backgroundColor: `${color}1F`,
            alignItems: 'center',
            justifyContent: 'center' }}>
          <AppIcon
            name={icon}
            size={isColumn ? 22 : 18}
            color={color}
            strokeWidth={2.4}
          />
        </View>
        <Text
          variant="caption"
          color={colors.text}
          style={{fontWeight: '700', flexShrink: 1}}
          numberOfLines={2}
          center={isColumn}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default CategoryChip;
