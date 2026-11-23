import React, {useEffect, useRef} from 'react';
import {Animated, Easing, ViewProps, StyleProp, ViewStyle} from 'react-native';
import {MOTION, useReducedMotion} from '@/utils/motion';

interface AnimateProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  from?: 'fade' | 'up' | 'scale';
  style?: StyleProp<ViewStyle>;
}

/**
 * Entrance motion for lists and hero blocks.
 * Respects reduce-motion; keeps pointer events on children.
 */
export function Animate({
  children,
  delay = 0,
  from = 'fade',
  style,
  ...rest
}: AnimateProps) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: MOTION.entrance,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [delay, progress, reduced]);

  const opacity = progress;
  const translateY =
    from === 'up'
      ? progress.interpolate({inputRange: [0, 1], outputRange: [12, 0]})
      : 0;
  const scale =
    from === 'scale'
      ? progress.interpolate({inputRange: [0, 1], outputRange: [0.96, 1]})
      : 1;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        style,
        {
          opacity,
          transform: [{translateY}, {scale}],
        },
      ]}
      {...rest}>
      {children}
    </Animated.View>
  );
}

export default Animate;
