import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Platform, View, StyleSheet} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@/theme';
import {Text} from './Text';
import {useToastStore} from '@/store/toastStore';
import {MOTION, useReducedMotion} from '@/utils/motion';
import {hapticSuccess} from '@/utils/haptics';

const CHECK_PATH = 'M7 13.5 L11 17.5 L18 9.5';
const PATH_LEN = 28;
const AnimatedPath = Animated.createAnimatedComponent(Path);

function AmberCheck({animate}: {animate: boolean}) {
  const {colors} = useTheme();
  const dash = useRef(new Animated.Value(PATH_LEN)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!animate || reduced) {
      dash.setValue(0);
      return;
    }
    dash.setValue(PATH_LEN);
    Animated.timing(dash, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animate, dash, reduced]);

  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.action}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Circle
          cx={13}
          cy={13}
          r={11}
          stroke={colors.action}
          strokeWidth={2}
          fill="none"
          opacity={0.35}
        />
        <AnimatedPath
          d={CHECK_PATH}
          stroke={colors.action}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${PATH_LEN}`}
          strokeDashoffset={dash}
        />
      </Svg>
    </View>
  );
}

export function ToastHost() {
  const {colors, radius, shadows, spacing} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore(s => s.current);
  const dismiss = useToastStore(s => s.dismiss);
  const reduced = useReducedMotion();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!toast) return;

    if (toast.kind === 'success') hapticSuccess();

    translateY.setValue(80);
    opacity.setValue(0);
    progress.setValue(1);

    const enter = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: reduced ? 0 : 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: reduced ? 0 : 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    const bar = Animated.timing(progress, {
      toValue: 0,
      duration: toast.duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });

    enter.start();
    bar.start(({finished}) => {
      if (!finished) return;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 40,
          duration: reduced ? 0 : 220,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: reduced ? 0 : 220,
          useNativeDriver: true,
        }),
      ]).start(() => dismiss());
    });

    return () => {
      bar.stop();
    };
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        {justifyContent: 'flex-end', zIndex: 9999, elevation: 9999},
      ]}>
      <Animated.View
        style={{
          marginHorizontal: spacing.lg,
          marginBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'web' ? 72 : 12),
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 10,
          flexDirection: 'column',
          overflow: 'hidden',
          ...shadows.lg,
          opacity,
          transform: [{translateY}],
          borderWidth: 1,
          borderColor: colors.border,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <AmberCheck animate={toast.kind === 'success'} />
          <Text variant="body" style={{flex: 1, fontWeight: '600'}}>
            {toast.message}
          </Text>
        </View>
        <View
          style={{
            marginTop: 12,
            height: 3,
            borderRadius: 999,
            backgroundColor: colors.border,
            overflow: 'hidden',
          }}>
          <Animated.View
            style={{
              height: '100%',
              width: barWidth as unknown as number,
              backgroundColor: colors.action,
              borderRadius: 999,
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

export default ToastHost;
