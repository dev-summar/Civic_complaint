import React from 'react';
import {View} from 'react-native';

export default function LinearGradient({style, children, ...rest}) {
  return React.createElement(View, {style, ...rest}, children);
}
