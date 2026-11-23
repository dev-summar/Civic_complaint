import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, StyleSheet, View} from 'react-native';

export type AvatarMood = 'idle' | 'listening' | 'thinking' | 'speaking';

const SKIN = '#e2b48a';
const SKIN_SHADE = '#c9956a';
const HAIR = '#1c1410';
const CAP = '#0F3D3A';
const CAP_SHADE = '#0A2E2C';
const VEST = '#14635C';
const STRIPE = '#FF7A1A';
const INK = '#1c1917';
const DESIGN = 160;

/**
 * SwachhSetu's field guide. Same talking states as Legal Setu's advocate
 * (idle, listening, thinking, speaking), drawn as a civic worker in a cap
 * and high-visibility vest instead of a black coat. Male, like the Bhashini voice.
 */
export function SetuAvatar({mood, size = 132, level = 0}: {mood: AvatarMood; size?: number; level?: number}) {
  const u = (n: number) => (n * size) / DESIGN;
  const reduced = useReducedMotion();
  const mouth = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const gaze = useRef(new Animated.Value(0)).current;
  const brows = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, {toValue: 0.1, duration: 70, useNativeDriver: true}),
          Animated.timing(blink, {toValue: 1, duration: 110, useNativeDriver: true}),
        ]).start(next);
      }, 2200 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(timer);
  }, [blink]);

  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, {toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(breathe, {toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, reduced]);

  useEffect(() => {
    const active = mood === 'listening' || mood === 'speaking';
    if (!active || reduced) {
      Animated.timing(ring, {toValue: active ? 1 : 0, duration: 200, useNativeDriver: true}).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(ring, {toValue: 1, duration: 700, useNativeDriver: true}),
      Animated.timing(ring, {toValue: 0.35, duration: 700, useNativeDriver: true}),
    ]));
    loop.start();
    return () => loop.stop();
  }, [mood, reduced, ring]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(gaze, {toValue: mood === 'thinking' ? 1 : 0, duration: 260, useNativeDriver: true}),
      Animated.timing(brows, {toValue: mood === 'listening' ? 1 : mood === 'thinking' ? 0.5 : 0, duration: 220, useNativeDriver: true}),
    ]).start();
  }, [brows, gaze, mood]);

  useEffect(() => {
    if (mood !== 'speaking' || reduced) {
      mouth.stopAnimation();
      Animated.timing(mouth, {toValue: 0, duration: 120, useNativeDriver: true}).start();
      return;
    }
    let alive = true;
    const flap = () => {
      if (!alive) return;
      Animated.sequence([
        Animated.timing(mouth, {toValue: 0.35 + Math.random() * 0.65, duration: 70 + Math.random() * 60, useNativeDriver: true}),
        Animated.timing(mouth, {toValue: 0.08 + Math.random() * 0.2, duration: 70 + Math.random() * 70, useNativeDriver: true}),
      ]).start(({finished}) => {
        if (finished) flap();
      });
    };
    flap();
    return () => {
      alive = false;
      mouth.stopAnimation();
    };
  }, [mood, mouth, reduced]);

  const bob = breathe.interpolate({inputRange: [0, 1], outputRange: [0, -u(2)]});
  const ringColor = mood === 'listening' ? STRIPE : CAP;
  const frame = size + u(16);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{width: frame, height: frame, alignItems: 'center', justifyContent: 'center', transform: [{scale: 1 + (mood === 'listening' ? level * 0.06 : 0)}]}}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {borderRadius: frame / 2, borderWidth: u(5), borderColor: ringColor, opacity: ring}]} />
      <View style={{width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#E7F2EF'}}>
        <Animated.View style={[StyleSheet.absoluteFill, {transform: [{translateY: bob}]}]}>
          <View style={box(u, 18, 118, 124, 60, {backgroundColor: VEST, borderTopLeftRadius: u(36), borderTopRightRadius: u(36)})} />
          <View style={box(u, 22, 132, 116, 10, {backgroundColor: STRIPE, borderRadius: u(4)})} />
          <View style={box(u, 68, 112, 24, 18, {backgroundColor: '#ffffff', borderTopLeftRadius: u(8), borderTopRightRadius: u(8)})} />
          <View style={box(u, 112, 146, 16, 16, {backgroundColor: '#ffffff', borderRadius: u(8), alignItems: 'center', justifyContent: 'center'})}>
            <View style={{width: u(8), height: u(8), borderRadius: u(4), backgroundColor: '#15803D'}} />
          </View>
          <View style={box(u, 67, 98, 26, 22, {backgroundColor: SKIN_SHADE})} />
          <View style={box(u, 34, 64, 14, 20, {backgroundColor: SKIN_SHADE, borderRadius: u(8)})} />
          <View style={box(u, 112, 64, 14, 20, {backgroundColor: SKIN_SHADE, borderRadius: u(8)})} />
          <View style={box(u, 42, 34, 76, 82, {backgroundColor: SKIN, borderRadius: u(38)})} />
          <View style={box(u, 42, 48, 8, 20, {backgroundColor: HAIR, borderBottomLeftRadius: u(4)})} />
          <View style={box(u, 110, 48, 8, 20, {backgroundColor: HAIR, borderBottomRightRadius: u(4)})} />
          <View style={box(u, 64, 87, 32, 6, {backgroundColor: HAIR, borderRadius: u(3)})} />
          <View style={box(u, 46, 22, 68, 28, {backgroundColor: CAP, borderTopLeftRadius: u(34), borderTopRightRadius: u(34)})} />
          <View style={box(u, 36, 44, 88, 10, {backgroundColor: CAP_SHADE, borderRadius: u(4)})} />
          <Animated.View style={[box(u, 56, 62, 16, 4, {backgroundColor: HAIR, borderRadius: u(2)}), {transform: [{translateY: brows.interpolate({inputRange: [0, 1], outputRange: [0, -u(3)]})}]}]} />
          <Animated.View style={[box(u, 88, 62, 16, 4, {backgroundColor: HAIR, borderRadius: u(2)}), {transform: [{translateY: brows.interpolate({inputRange: [0, 1], outputRange: [0, -u(3)]})}]}]} />
          {[58, 90].map(left => (
            <View key={left} style={box(u, left, 68, 13, 12, {backgroundColor: '#ffffff', borderRadius: u(6), overflow: 'hidden', alignItems: 'center', justifyContent: 'center'})}>
              <Animated.View style={{
                width: u(8), height: u(8), borderRadius: u(4), backgroundColor: INK,
                transform: [
                  {translateX: gaze.interpolate({inputRange: [0, 1], outputRange: [0, u(2)]})},
                  {translateY: gaze.interpolate({inputRange: [0, 1], outputRange: [0, -u(2.5)]})},
                  {scaleY: blink},
                ],
              }} />
            </View>
          ))}
          <View style={box(u, 77, 80, 7, 10, {backgroundColor: SKIN_SHADE, borderRadius: u(4), opacity: 0.7})} />
          <Animated.View style={[
            box(u, 67, 94, 26, 10, {borderBottomWidth: u(3), borderColor: '#7c2d12', borderBottomLeftRadius: u(13), borderBottomRightRadius: u(13)}),
            {opacity: mouth.interpolate({inputRange: [0, 0.15], outputRange: [1, 0], extrapolate: 'clamp'})},
          ]} />
          <Animated.View style={[
            box(u, 69, 96, 22, 14, {backgroundColor: '#5b1a1a', borderRadius: u(8), overflow: 'hidden'}),
            {
              opacity: mouth.interpolate({inputRange: [0, 0.15], outputRange: [0, 1], extrapolate: 'clamp'}),
              transform: [{scaleY: mouth.interpolate({inputRange: [0, 1], outputRange: [0.15, 1]})}],
            },
          ]}>
            <View style={{position: 'absolute', left: 0, right: 0, top: 0, height: u(4), backgroundColor: '#ffffff'}} />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

function box(u: (n: number) => number, left: number, top: number, width: number, height: number, extra: object) {
  return {position: 'absolute' as const, left: u(left), top: u(top), width: u(width), height: u(height), ...extra};
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => active && setReduced(value)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
