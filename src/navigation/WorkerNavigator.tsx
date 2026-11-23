import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {tabIcon, useTabScreenOptions} from './tabOptions';
import {WorkerStackParamList, WorkerTabParamList} from './types';
import WorkerJobsScreen from '@/screens/worker/JobsScreen';
import WorkerNavigateScreen from '@/screens/worker/NavigateScreen';
import WorkerActiveScreen from '@/screens/worker/ActiveScreen';
import WorkerProfileScreen from '@/screens/worker/ProfileScreen';
import JobDetailScreen from '@/screens/worker/JobDetailScreen';
import {NotificationInbox} from '@/screens/citizen/NotificationsScreen';

const Tab = createBottomTabNavigator<WorkerTabParamList>();
const Stack = createNativeStackNavigator<WorkerStackParamList>();

function WorkerTabs() {
  const {desktop, screenOptions, tabBar} = useTabScreenOptions();
  const icon = (name: Parameters<typeof tabIcon>[0]) =>
    tabIcon(name, {compact: desktop});
  return (
    <Tab.Navigator detachInactiveScreens={false} screenOptions={screenOptions} {...(tabBar ? {tabBar} : {})}>
      <Tab.Screen name="Jobs" component={WorkerJobsScreen} options={{tabBarIcon: icon('briefcase')}} />
      <Tab.Screen name="Navigate" component={WorkerNavigateScreen} options={{tabBarIcon: icon('navigation')}} />
      <Tab.Screen name="Active" component={WorkerActiveScreen} options={{tabBarIcon: icon('zap')}} />
      <Tab.Screen name="Profile" component={WorkerProfileScreen} options={{tabBarIcon: icon('user')}} />
    </Tab.Navigator>
  );
}

export function WorkerNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
      <Stack.Screen name="Tabs" component={WorkerTabs} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} />
      <Stack.Screen name="Notifications">
        {({navigation}) => <NotificationInbox onBack={() => navigation.goBack()}
          onComplaint={id => navigation.navigate('JobDetail', {id})} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default WorkerNavigator;
