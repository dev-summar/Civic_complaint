import React from 'react';
import {Text} from 'react-native-web';

function Icon({name, size = 24, color = '#111', style, ...rest}) {
  return React.createElement(
    Text,
    {
      style: [{fontSize: size, color, lineHeight: size, textAlign: 'center'}, style],
      ...rest,
    },
    '•',
  );
}

Icon.glyphMap = {};
export default Icon;
