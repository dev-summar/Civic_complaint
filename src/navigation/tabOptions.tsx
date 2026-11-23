import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Platform, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import type {BottomTabBarButtonProps, BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {AppIcon, IconName} from '@/components/ui';
import {useTheme} from '@/theme';
import type {lightColors} from '@/theme/colors';
import {fonts} from '@/theme/typography';
import {useReducedMotion} from '@/utils/motion';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {useSidebarCollapsed} from './sidebarState';
import {DesktopSidebar} from './DesktopSidebar';

type Colors = typeof lightColors;

/** Amber dot + spring bounce (−2px then settle) on tab switch. */
export function tabIcon(name: IconName, opts?: {compact?: boolean}) {
  return ({color, focused}: {color: string; focused: boolean}) => (
    <TabIconInner
      name={name}
      color={color}
      focused={focused}
      compact={opts?.compact}
    />
  );
}

function TabIconInner({
  name,
  color,
  focused,
  compact = false,
}: {
  name: IconName;
  color: string;
  focused: boolean;
  compact?: boolean;
}) {
  const lift = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (focused && !wasFocused.current) {
      if (reduced) {
        lift.setValue(0);
      } else {
        // Bounce: −2px then settle (≤300ms)
        lift.setValue(0);
        Animated.sequence([
          Animated.timing(lift, {
            toValue: -2,
            duration: 90,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(lift, {
            toValue: 0,
            friction: 5,
            tension: 280,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
    wasFocused.current = focused;
  }, [focused, lift, reduced]);

  return (
    <Animated.View
      style={{
        width: compact ? 22 : undefined,
        height: compact ? 22 : undefined,
        overflow: compact ? 'hidden' : 'visible',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{translateY: lift}],
      }}>
{compact ? null : focused ? (
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: '#FF7A1A',
            marginBottom: 4,
          }}
        />
      ) : (
        <View style={{height: 9}} />
      )}
      <AppIcon
        name={name}
        size={focused ? 24 : 22}
        color={color}
        strokeWidth={focused ? 2.4 : 2}
      />
    </Animated.View>
  );
}

export function getTabBarOptions(colors: Colors) {
  return {
    headerShown: false as const,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.neutral500,
    tabBarLabelStyle: {
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: '600' as const,
      marginBottom: Platform.OS === 'ios' ? 0 : 4,
    },
    freezeOnBlur: false,
    tabBarButton: (props: BottomTabBarButtonProps) => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={props.accessibilityState}
        accessibilityLabel={props.accessibilityLabel}
        testID={props.testID}
        onPress={props.onPress}
        onLongPress={props.onLongPress ?? undefined}
        style={props.style}
        activeOpacity={0.75}>
        {props.children}
      </TouchableOpacity>
    ),
    tabBarStyle: {
      backgroundColor: colors.tabBar,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: Platform.OS === 'ios' ? 88 : 68,
      paddingTop: 4,
      paddingBottom: Platform.OS === 'ios' ? 28 : 10,
      elevation: 8,
      shadowColor: '#0F3D3E',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: -4},
    },
  };
}

export function useTabScreenOptions() {
  const {colors} = useTheme();
  const desktop = useDesktopLayout();
  const sidebar = useSidebarCollapsed();
  const base = getTabBarOptions(colors);

  if (!desktop) {
    return {desktop, screenOptions: base, tabBar: undefined};
  }

  const screenOptions = {
    headerShown: false as const,
    tabBarPosition: 'left' as const,
    tabBarActiveTintColor: '#0F3D3E',
    tabBarInactiveTintColor: colors.neutral500,
    tabBarStyle: {
      width: sidebar.width,
      minWidth: sidebar.width,
      maxWidth: sidebar.width,
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
    },
  };

  return {
    desktop,
    screenOptions,
    tabBar: (props: BottomTabBarProps) => <DesktopSidebar {...props} />,
  };
}
