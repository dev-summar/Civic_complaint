import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {tabIcon, useTabScreenOptions} from './tabOptions';
import {OfficerStackParamList, OfficerTabParamList} from './types';
import OfficerDashboardScreen from '@/screens/officer/DashboardScreen';
import OfficerQueueScreen from '@/screens/officer/QueueScreen';
import OfficerAssignScreen from '@/screens/officer/AssignScreen';
import OfficerAnalyticsScreen from '@/screens/officer/AnalyticsScreen';
import OfficerProfileScreen from '@/screens/officer/ProfileScreen';
import OfficerComplaintDetailScreen from '@/screens/officer/ComplaintDetailScreen';
import {NotificationInbox} from '@/screens/citizen/NotificationsScreen';

const Tab = createBottomTabNavigator<OfficerTabParamList>();
const Stack = createNativeStackNavigator<OfficerStackParamList>();

function OfficerTabs() {
  const {desktop, screenOptions, tabBar} = useTabScreenOptions();
  const icon = (name: Parameters<typeof tabIcon>[0]) =>
    tabIcon(name, {compact: desktop});
  return (
    <Tab.Navigator detachInactiveScreens={false} screenOptions={screenOptions} {...(tabBar ? {tabBar} : {})}>
      <Tab.Screen name="Dashboard" component={OfficerDashboardScreen} options={{tabBarIcon: icon('grid')}} />
      <Tab.Screen name="Queue" component={OfficerQueueScreen} options={{tabBarIcon: icon('list')}} />
      <Tab.Screen name="Assign" component={OfficerAssignScreen} options={{tabBarIcon: icon('users')}} />
      <Tab.Screen name="Analytics" component={OfficerAnalyticsScreen} options={{tabBarIcon: icon('bar-chart')}} />
      <Tab.Screen name="Profile" component={OfficerProfileScreen} options={{tabBarIcon: icon('user')}} />
    </Tab.Navigator>
  );
}

export function OfficerNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
      <Stack.Screen name="Tabs" component={OfficerTabs} />
      <Stack.Screen name="ComplaintDetail" component={OfficerComplaintDetailScreen} />
      <Stack.Screen name="Notifications">
        {({navigation}) => <NotificationInbox onBack={() => navigation.goBack()}
          onComplaint={id => navigation.navigate('ComplaintDetail', {id})} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default OfficerNavigator;
