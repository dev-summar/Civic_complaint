import React, {useEffect, useRef} from 'react';
import {View, Animated, Easing, Platform} from 'react-native';
import {useTheme} from '@/theme';
import {
  STATUS_TRAIL_STAGES,
  STATUS_TRAIL_LABELS,
  statusToTrailIndex,
} from '@/theme';
import {Text} from './Text';
import {fonts} from '@/theme/typography';
import {MOTION, useReducedMotion} from '@/utils/motion';

interface StatusTrailProps {
  status: string;
  size?: 'compact' | 'full';
  currentTimestamp?: string;
}

function formatTs(iso?: string) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export function StatusTrail({
  status,
  size = 'compact',
  currentTimestamp,
}: StatusTrailProps) {
  const {colors, spacing} = useTheme();
  const currentIndex = statusToTrailIndex(status);
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.45)).current;
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      pulse.setValue(1);
      pulseOpacity.setValue(0.35);
      return;
    }

    const half = MOTION.trailPulse / 2;
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.15,
            duration: half,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: half,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.15,
            duration: half,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.5,
            duration: half,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseOpacity, reduced]);

  const isFull = size === 'full';
  const dotSize = isFull ? 14 : 10;
  const lineHeight = isFull ? 3 : 2;

  return (
    <View style={{width: '100%'}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: isFull ? 4 : 0,
        }}>
        {STATUS_TRAIL_STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const upcoming = index > currentIndex;
          const isLast = index === STATUS_TRAIL_STAGES.length - 1;

          return (
            <React.Fragment key={stage}>
              <View style={{alignItems: 'center', zIndex: 2}}>
                {current ? (
                  <View
                    style={{
                      width: dotSize + 10,
                      height: dotSize + 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: dotSize + 10,
                        height: dotSize + 10,
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor: colors.action,
                        opacity: pulseOpacity,
                        transform: [{scale: pulse}],
                        ...(Platform.OS === 'web' && !reduced
                          ? ({
                              animationName: 'gc-trail-pulse',
                              animationDuration: '2s',
                              animationIterationCount: 'infinite',
                              animationTimingFunction: 'ease-in-out',
                            } as object)
                          : null),
                      }}
                    />
                    <View
                      style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: 999,
                        backgroundColor: colors.action,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: 999,
                      backgroundColor: done ? colors.success : 'transparent',
                      borderWidth: upcoming || done ? 2 : 0,
                      borderColor: done ? colors.success : colors.neutral500,
                    }}
                  />
                )}
              </View>
              {!isLast ? (
                <View
                  style={{
                    flex: 1,
                    height: lineHeight,
                    marginHorizontal: 2,
                    borderRadius: 2,
                    backgroundColor:
                      index < currentIndex ? colors.success : colors.border,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginTop: isFull ? spacing.sm : 6,
          justifyContent: 'space-between',
        }}>
        {STATUS_TRAIL_STAGES.map((stage, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const color = current ? colors.action : done ? colors.success : colors.neutral500;
          return (
            <View
              key={`${stage}-label`}
              style={{flex: 1, alignItems: 'center', paddingHorizontal: 1}}>
              <Text
                variant="caption"
                color={color}
                center
                style={{
                  fontSize: isFull ? 10 : 9,
                  fontWeight: current ? '800' : '600',
                  fontFamily: fonts.body,
                }}
                numberOfLines={2}>
                {STATUS_TRAIL_LABELS[stage]}
              </Text>
              {isFull && current && formatTs(currentTimestamp) ? (
                <Text
                  variant="caption"
                  muted
                  center
                  style={{fontSize: 9, marginTop: 2, fontFamily: fonts.mono}}>
                  {formatTs(currentTimestamp)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default StatusTrail;
