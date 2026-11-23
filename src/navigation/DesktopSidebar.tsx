import React from 'react';
import {View} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {Text, AppIcon} from '@/components/ui';
import {fonts} from '@/theme/typography';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useSidebarCollapsed} from './sidebarState';

export function DesktopSidebar({state, descriptors, navigation}: BottomTabBarProps) {
  const {collapsed, toggle, width} = useSidebarCollapsed();

  return (
    <View
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        flexGrow: 0,
        flexShrink: 0,
        alignSelf: 'stretch',
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingBottom: 8,
      }}>
      <View style={{height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4}}>
        <View style={{width: 28, height: 28, borderRadius: 8, backgroundColor: '#0F3D3A', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
          <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF'}} />
        </View>
        {collapsed ? null : (
          <Text numberOfLines={1} style={{flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}}>SwachhSetu</Text>
        )}
      </View>

      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const {options} = descriptors[route.key];
        const rawLabel = options.tabBarLabel ?? options.title ?? route.name;
        const label = typeof rawLabel === 'string' ? rawLabel : route.name;
        const color = focused ? '#0F3D3A' : '#4B5563';
        const onPress = () => {
          const event = navigation.emit({type: 'tabPress', target: route.key, canPreventDefault: true});
          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({...CommonActions.navigate(route.name, route.params), target: state.key});
          }
        };
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{selected: focused}}
            accessibilityLabel={label}
            onPress={onPress}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              height: 36,
              paddingHorizontal: collapsed ? 0 : 8,
              borderRadius: 8,
              marginBottom: 4,
              backgroundColor: focused ? '#E6F0EC' : 'transparent',
              borderWidth: 0,
            }}>
            <View style={{width: 18, height: 18, alignItems: 'center', justifyContent: 'center'}}>
              {options.tabBarIcon?.({focused, color, size: 18})}
            </View>
            {collapsed ? null : (
              <Text numberOfLines={1} style={{flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, fontWeight: focused ? '600' : '500', color}}>
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={{flex: 1}} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onPress={toggle}
        style={{width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: collapsed ? 'center' : 'flex-start'}}>
        <AppIcon name={collapsed ? 'chevron-right' : 'chevron-left'} size={18} color="#4B5563" />
      </TouchableOpacity>
    </View>
  );
}
