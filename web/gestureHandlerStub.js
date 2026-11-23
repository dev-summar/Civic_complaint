import React from 'react';
import {
  View,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  RefreshControl,
} from 'react-native-web';

export const GestureHandlerRootView = ({style, children, ...rest}) =>
  React.createElement(View, {style: [{flex: 1}, style], ...rest}, children);

export {ScrollView, Switch, TextInput, Pressable, TouchableHighlight, TouchableOpacity, TouchableWithoutFeedback, FlatList, RefreshControl};
export const DrawerLayout = View;
export const State = {};
export const Directions = {};
export const gestureHandlerRootHOC = C => C;
export const Swipeable = View;
export const DrawerLayoutAndroid = View;
export const TouchableNativeFeedback = TouchableOpacity;

export default {
  GestureHandlerRootView,
  gestureHandlerRootHOC,
};
