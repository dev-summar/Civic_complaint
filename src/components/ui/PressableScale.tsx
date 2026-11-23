import React, {useRef} from 'react';
import {
  Animated,
  Easing,
  TouchableOpacityProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {TouchableOpacity} from './TouchableOpacity';
import {MOTION, useReducedMotion} from '@/utils/motion';

interface PressableScaleProps extends Omit<TouchableOpacityProps, 'style' | 'children'> {
  children: React.ReactNode | ((pressed: boolean) => React.ReactNode);
  style?: TouchableOpacityProps['style'];
  contentStyle?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  pressedScale?: number;
}

/** All interactive chrome: 0.98 scale on press, 150ms ease-out. */
export function PressableScale({
  children,
  style,
  contentStyle,
  pressedScale = 0.98,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = React.useState(false);

  const animateTo = (value: number) => {
    if (reduced) {
      scale.setValue(value);
      return;
    }
    Animated.timing(scale, {
      toValue: value,
      duration: MOTION.press,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const resolvedContent =
    typeof contentStyle === 'function' ? contentStyle(pressed) : contentStyle;

  return (
    <Animated.View style={{transform: [{scale}]}}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPress={onPress}
        onPressIn={e => {
          if (!disabled) {
            setPressed(true);
            animateTo(pressedScale);
          }
          (onPressIn as any)?.(e);
        }}
        onPressOut={e => {
          setPressed(false);
          animateTo(1);
          (onPressOut as any)?.(e);
        }}
        style={[resolvedContent, style]}
        {...rest}>
        {typeof children === 'function' ? children(pressed) : children}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default PressableScale;
