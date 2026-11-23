import React from 'react';
import {Platform, View, ViewStyle, unstable_createElement as createElement} from 'react-native';
import Svg, {Path, Circle} from 'react-native-svg';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {BRAND} from '@/constants';
import {Text} from './Text';

type WordmarkSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<
  WordmarkSize,
  {mark: number; name: number; tag: number; gap: number; height: number}
> = {
  sm: {mark: 16, name: 13, tag: 9, gap: 5, height: 18},
  md: {mark: 20, name: 15, tag: 10, gap: 6, height: 22},
  lg: {mark: 28, name: 22, tag: 11, gap: 8, height: 30},
};

const PIN_PATH =
  'M10 1.75C6.27 1.75 3.25 4.72 3.25 8.35c0 2.55 1.55 4.72 3.55 6.55L10 18.1l3.2-3.2c2-1.83 3.55-4 3.55-6.55C16.75 4.72 13.73 1.75 10 1.75z';

function pinImage(fill: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">` +
    `<path fill="${fill}" d="${PIN_PATH}"/>` +
    `<circle cx="10" cy="8.2" r="2.35" fill="#ffffff"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Abstract pin mark — locked to its pixel size so it cannot stretch on web. */
export function SwachhSetuMark({
  size = 20,
  color,
}: {
  size?: number;
  color?: string;
}) {
  const {colors} = useTheme();
  const fill = color ?? colors.primary;
  const box = {
    width: size,
    height: size,
    minWidth: size,
    maxWidth: size,
    minHeight: size,
    maxHeight: size,
    flexGrow: 0,
    flexShrink: 0,
  } as const;
  if (Platform.OS === 'web') {
    return createElement('img', {
      src: pinImage(fill),
      alt: '',
      width: size,
      height: size,
      draggable: false,
      style: {...box, display: 'block'},
    });
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={box}>
      <Path d={PIN_PATH} fill={fill} />
      <Circle cx={10} cy={8.2} r={2.35} fill="#FFFFFF" />
    </Svg>
  );
}

// Backward compatibility alias
export const RabtaMark = SwachhSetuMark;

interface BrandWordmarkProps {
  size?: WordmarkSize;
  style?: ViewStyle;
  showTag?: boolean;
}

/**
 * Brand lockup: [mark] SwachhSetu
 * Reuse anywhere the product name appears (header, login, splash).
 */
export function BrandWordmark({
  size = 'md',
  style,
  showTag = false,
}: BrandWordmarkProps) {
  const {colors} = useTheme();
  const s = SIZE_MAP[size];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          flexGrow: 0,
          flexShrink: 0,
          height: s.height,
          gap: s.gap,
        },
        style,
      ]}
      accessibilityRole="header"
      accessibilityLabel={BRAND.name}>
      <View
        style={{
          width: s.mark,
          height: s.mark,
          minWidth: s.mark,
          maxWidth: s.mark,
          overflow: 'hidden',
          position: 'relative',
          flexGrow: 0,
          flexShrink: 0,
        }}>
        <SwachhSetuMark size={s.mark} color={colors.primary} />
      </View>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: s.gap}}>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: s.name,
            fontWeight: '700',
            color: colors.primary,
            letterSpacing: -0.2,
            lineHeight: s.name + 4,
          }}>
          {BRAND.shortName}
        </Text>
        {showTag ? (
          <View
            style={{
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: `${colors.action}18`,
            }}>
            <Text
              style={{
                fontFamily: fonts.mono,
                fontSize: s.tag,
                fontWeight: '700',
                color: colors.action,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                lineHeight: s.tag + 2,
              }}>
              Civic
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default BrandWordmark;
