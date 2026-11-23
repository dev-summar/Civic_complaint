import React from 'react';
import {View} from 'react-native-web';

export * from 'react-native-web';

// Minimal stubs so navigation / screens don't crash on web
export const enableScreens = () => {};
export const enableFreeze = () => {};
export const screensEnabled = () => false;
export const freezeEnabled = () => false;
export const Screen = ({children, ...props}) =>
  React.createElement(View, {style: {flex: 1}, ...props}, children);
export const ScreenContainer = Screen;
export const ScreenStack = Screen;
export const ScreenStackHeaderConfig = () => null;
export const NativeScreen = Screen;
export const NativeScreenContainer = Screen;
export const FullWindowOverlay = ({children}) => children || null;
export const useTransitionProgress = () => ({progress: {value: 0}, closing: {value: 0}, goingForward: {value: 0}});
export default {enableScreens, enableFreeze, Screen};
