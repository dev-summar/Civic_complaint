import React from 'react';
import {StyleProp, TouchableOpacityProps, ViewStyle} from 'react-native';
import {Pressable, PressableProps} from 'react-native-gesture-handler';

type Props = TouchableOpacityProps;

/**
 * Gesture Handler's TouchableOpacity draws on an inner view and listens on an
 * outer native button. The Android release build (New Architecture) flattens
 * that outer view, so the control is visible and dead. Pressable is one view:
 * the same view is drawn and receives the tap.
 */
export function TouchableOpacity({
  activeOpacity = 0.7,
  disabled,
  style,
  children,
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  delayLongPress,
  hitSlop,
  testID,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityActions,
  onAccessibilityAction,
  accessible,
  ...rest
}: Props) {
  return (
    <Pressable
      {...(rest as PressableProps)}
      accessible={accessible}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      disabled={disabled ?? undefined}
      onPress={onPress as PressableProps['onPress']}
      onPressIn={onPressIn as PressableProps['onPressIn']}
      onPressOut={onPressOut as PressableProps['onPressOut']}
      onLongPress={onLongPress as PressableProps['onLongPress']}
      delayLongPress={delayLongPress}
      hitSlop={hitSlop}
      testID={testID}
      style={({pressed}) => [
        style as StyleProp<ViewStyle>,
        pressed && !disabled ? {opacity: activeOpacity ?? 0.7} : null,
      ]}>
      {children}
    </Pressable>
  );
}

export default TouchableOpacity;
