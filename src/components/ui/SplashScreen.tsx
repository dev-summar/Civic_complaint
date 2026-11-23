import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StatusBar, StyleSheet, View} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import {BRAND} from '@/constants';

interface SplashScreenProps {
  ready: boolean;
  onFinish: () => void;
}

export function SplashScreen({ready, onFinish}: SplashScreenProps) {
  const ring = useRef(new Animated.Value(0.86)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring, {
            toValue: 1.06,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0.86,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.timing(bar, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [bar, fade, ring]);

  useEffect(() => {
    if (!ready || finished.current) return;
    const timer = setTimeout(() => {
      finished.current = true;
      onFinish();
    }, 2300);
    return () => clearTimeout(timer);
  }, [ready, onFinish]);

  const barWidth = bar.interpolate({
    inputRange: [0, 1],
    outputRange: ['8%', '100%'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2E2F" />
      <Animated.View
        style={[styles.ring, styles.ringOuter, {transform: [{scale: ring}]}]}
      />
      <Animated.View
        style={[styles.ring, styles.ringInner, {transform: [{scale: ring}]}]}
      />
      <Animated.View style={{alignItems: 'center', opacity: fade}}>
        <View style={styles.mark}>
          <Svg width={72} height={72} viewBox="0 0 72 72">
            <Path
              d="M36 8C23.3 8 13 18.1 13 30.4c0 9.1 5.5 16.8 12.6 23.3L36 64l10.4-10.3C53.5 47.2 59 39.5 59 30.4 59 18.1 48.7 8 36 8z"
              fill="#FFFFFF"
            />
            <Circle cx={36} cy={30} r={8} fill="#FF7A1A" />
          </Svg>
        </View>
        <Animated.Text style={styles.name}>{BRAND.name}</Animated.Text>
        <Animated.Text style={styles.meaning}>{BRAND.meaning}</Animated.Text>
        <Animated.Text style={styles.tagline}>{BRAND.taglineShort}</Animated.Text>
      </Animated.View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, {width: barWidth}]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A2E2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.35)',
  },
  ringOuter: {
    width: 280,
    height: 280,
  },
  ringInner: {
    width: 200,
    height: 200,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mark: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: '#0F3D3E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 28,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  meaning: {
    marginTop: 8,
    color: '#FF7A1A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  tagline: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
  },
  barTrack: {
    position: 'absolute',
    bottom: 48,
    width: 160,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FF7A1A',
    borderRadius: 99,
  },
});

export default SplashScreen;
