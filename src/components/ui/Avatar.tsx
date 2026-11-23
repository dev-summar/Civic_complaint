import React from 'react';
import {View, Image} from 'react-native';
import {useTheme} from '@/theme';
import {Text} from './Text';
import {getInitials} from '@/utils/format';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

export function Avatar({name, uri, size = 44}: AvatarProps) {
  const {colors} = useTheme();

  if (uri) {
    return (
      <Image
        source={{uri}}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.border,
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        variant="label"
        color={colors.white}
        style={{fontSize: size * 0.38, fontWeight: '700'}}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

export default Avatar;
