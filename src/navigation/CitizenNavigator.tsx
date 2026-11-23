import React, {useEffect, useRef} from 'react';
import {Platform, Animated, Easing} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTheme} from '@/theme';
import {AppIcon} from '@/components/ui';
import {tabIcon, useTabScreenOptions} from './tabOptions';
import {CitizenStackParamList, CitizenTabParamList} from './types';
import CitizenHomeScreen from '@/screens/citizen/HomeScreen';
import CitizenMapScreen from '@/screens/citizen/MapScreen';
import CitizenReportScreen from '@/screens/citizen/ReportScreen';
import ReportChatScreen from '@/screens/citizen/ReportChatScreen';
import CitizenHistoryScreen from '@/screens/citizen/HistoryScreen';
import CitizenProfileScreen from '@/screens/citizen/ProfileScreen';
import ComplaintDetailScreen from '@/screens/citizen/ComplaintDetailScreen';
import NotificationsScreen from '@/screens/citizen/NotificationsScreen';
import SettingsScreen from '@/screens/citizen/SettingsScreen';
import SavedLocationsScreen from '@/screens/citizen/SavedLocationsScreen';
import LeaderboardScreen from '@/screens/citizen/LeaderboardScreen';

const Tab = createBottomTabNavigator<CitizenTabParamList>();
const Stack = createNativeStackNavigator<CitizenStackParamList>();

function ReportTabIcon({focused}: {focused: boolean}) {
  const {colors, shadows} = useTheme();
  const bounce = useRef(new Animated.Value(1)).current;
  const wasFocused = useRef(focused);

  useEffect(() => {
    if (focused && !wasFocused.current) {
      bounce.setValue(1);
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1.08,
          duration: 90,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(bounce, {
          toValue: 1,
          friction: 5,
          tension: 280,
          useNativeDriver: true,
        }),
      ]).start();
    }
    wasFocused.current = focused;
  }, [focused, bounce]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -22,
        width: 58,
        height: 58,
        borderRadius: 999,
        backgroundColor: colors.action,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: colors.background,
        ...shadows.card,
        shadowOpacity: 0.14,
        elevation: 6,
        transform: [{scale: bounce}],
      }}>
      <AppIcon name="plus" size={28} color="#FFFFFF" strokeWidth={2.6} />
    </Animated.View>
  );
}

function CitizenTabs() {
  const {colors} = useTheme();
  const {desktop, screenOptions, tabBar} = useTabScreenOptions();

  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      {...(tabBar ? {tabBar} : {})}
      screenOptions={
        desktop
          ? screenOptions
          : {
              ...screenOptions,
              tabBarStyle: {
                ...screenOptions.tabBarStyle,
                height: Platform.OS === 'ios' ? 92 : 96,
                paddingTop: 8,
                paddingBottom: 14,
              },
            }
      }>
      <Tab.Screen
        name="Home"
        component={CitizenHomeScreen}
        options={{tabBarIcon: tabIcon('home', {compact: desktop})}}
      />
      <Tab.Screen
        name="Map"
        component={CitizenMapScreen}
        options={{tabBarIcon: tabIcon('map', {compact: desktop})}}
      />
      <Tab.Screen
        name="Report"
        component={CitizenReportScreen}
        options={{
          title: 'Report',
          tabBarLabel: 'Report',
          tabBarIcon: desktop
            ? ({color}) => (
                <AppIcon name="plus" size={22} color={color} strokeWidth={2.6} />
              )
            : ({focused}) => <ReportTabIcon focused={focused} />,
          tabBarLabelStyle: desktop
            ? undefined
            : {
                marginTop: 16,
                fontWeight: '700',
              },
          tabBarActiveTintColor: colors.primary,
        }}
      />
      <Tab.Screen
        name="History"
        component={CitizenHistoryScreen}
        options={{tabBarIcon: tabIcon('clock', {compact: desktop})}}
      />
      <Tab.Screen
        name="Profile"
        component={CitizenProfileScreen}
        options={{tabBarIcon: tabIcon('user', {compact: desktop})}}
      />
    </Tab.Navigator>
  );
}

export function CitizenNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
      <Stack.Screen name="Tabs" component={CitizenTabs} />
      <Stack.Screen name="ReportChat" component={ReportChatScreen} />
      <Stack.Screen name="ComplaintDetail" component={ComplaintDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SavedLocations" component={SavedLocationsScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
    </Stack.Navigator>
  );
}

export default CitizenNavigator;
