import {View, Text, Image, ScrollView, FlatList} from 'react-native-web';

export const useSharedValue = initial => ({value: initial});
export const useAnimatedStyle = () => ({});
export const useDerivedValue = fn => ({value: typeof fn === 'function' ? fn() : fn});
export const useAnimatedProps = () => ({});
export const useAnimatedReaction = () => {};
export const useAnimatedRef = () => ({current: null});
export const useAnimatedScrollHandler = () => () => {};
export const useAnimatedGestureHandler = () => ({});
export const withTiming = v => v;
export const withSpring = v => v;
export const withDelay = (_, v) => v;
export const withSequence = (...v) => v[v.length - 1];
export const withRepeat = v => v;
export const withDecay = v => (typeof v === 'object' && v?.velocity != null ? v.velocity : v);
export const cancelAnimation = () => {};
export const runOnJS = fn => fn;
export const runOnUI = fn => fn;
export const Easing = {linear: x => x, ease: x => x, bezier: () => x => x, in: x => x, out: x => x, inOut: x => x};
export const interpolate = (v, _i, o) => (o && o[0]) || v;
export const Extrapolate = {CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity'};
export const Extrapolation = Extrapolate;
export const ReduceMotion = {System: 'system', Always: 'always', Never: 'never'};
export const createAnimatedComponent = C => C;
export const makeMutable = initial => ({value: initial});
export const measure = () => null;
export const scrollTo = () => {};
export const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  createAnimatedComponent,
};
export default Animated;
