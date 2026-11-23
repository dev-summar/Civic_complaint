import React from 'react';
import {NotificationInbox} from '@/screens/citizen/NotificationsScreen';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {tabIcon, useTabScreenOptions} from './tabOptions';
import {AdminStackParamList, AdminTabParamList} from './types';
import AdminOverviewScreen from '@/screens/admin/OverviewScreen';
import AdminUsersScreen from '@/screens/admin/UsersScreen';
import AdminDepartmentsScreen from '@/screens/admin/DepartmentsScreen';
import AdminReportsScreen from '@/screens/admin/ReportsScreen';
import AdminMoreScreen from '@/screens/admin/MoreScreen';
import AdminZonesScreen from '@/screens/admin/ZonesScreen';
import AdminCategoriesScreen from '@/screens/admin/CategoriesScreen';
import AdminAuditScreen from '@/screens/admin/AuditScreen';
import AdminComplaintDetailScreen from '@/screens/admin/ComplaintDetailScreen';
import AdminComplaintsScreen from '@/screens/admin/ComplaintsScreen';
import AdminComplaintMapsScreen from '@/screens/admin/ComplaintMapsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  const {desktop, screenOptions, tabBar} = useTabScreenOptions();
  const icon = (name: Parameters<typeof tabIcon>[0]) =>
    tabIcon(name, {compact: desktop});
  return (
    <Tab.Navigator detachInactiveScreens={false} screenOptions={screenOptions} {...(tabBar ? {tabBar} : {})}>
      <Tab.Screen name="Overview" component={AdminOverviewScreen} options={{tabBarIcon: icon('gauge')}} />
      <Tab.Screen name="Complaints" component={AdminComplaintsScreen} options={{tabBarIcon: icon('list')}} />
      <Tab.Screen name="ComplaintMaps" component={AdminComplaintMapsScreen} options={{title: 'Complaint Maps', tabBarLabel: 'Complaint Maps', tabBarIcon: icon('map')}} />
      <Tab.Screen name="Users" component={AdminUsersScreen} options={{tabBarIcon: icon('users')}} />
      <Tab.Screen name="Reports" component={AdminReportsScreen} options={{tabBarIcon: icon('file-text')}} />
      <Tab.Screen name="More" component={AdminMoreScreen} options={{tabBarIcon: icon('menu')}} />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false, animation: 'slide_from_right'}}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
      <Stack.Screen name="Departments" component={AdminDepartmentsScreen} />
      <Stack.Screen name="Zones" component={AdminZonesScreen} />
      <Stack.Screen name="Categories" component={AdminCategoriesScreen} />
      <Stack.Screen name="Audit" component={AdminAuditScreen} />
      <Stack.Screen name="ComplaintDetail" component={AdminComplaintDetailScreen} />
      <Stack.Screen name="Notifications">
        {({navigation}) => <NotificationInbox onBack={() => navigation.goBack()}
          onComplaint={id => navigation.navigate('ComplaintDetail', {id})} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default AdminNavigator;
