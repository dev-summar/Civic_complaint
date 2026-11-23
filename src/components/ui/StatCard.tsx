import React from 'react';
import {View} from 'react-native';
import {useTheme} from '@/theme';
import {AppIcon, IconName} from './AppIcon';
import {Text} from './Text';
import {Animate} from './Animate';
import {fonts} from '@/theme/typography';
import {MOTION} from '@/utils/motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: IconName;
  /** Soft teal fill — use for the primary/highlighted stat */
  emphasize?: boolean;
  trend?: string;
  color?: string;
  index?: number;
}

export function StatCard({
  label,
  value,
  icon,
  emphasize = false,
  trend,
  color,
  index = 0,
}: StatCardProps) {
  const {colors, radius} = useTheme();
  const accent = color ?? (emphasize ? colors.primary : colors.neutral500);

  return (
    <Animate from="up" delay={index * MOTION.stagger} style={{flex: 1, minWidth: 96}}>
      <View
        style={{
          borderRadius: radius.xl,
          paddingVertical: 14,
          paddingHorizontal: 14,
          backgroundColor: emphasize ? colors.primarySoft : colors.surface,
          borderWidth: 1,
          borderColor: emphasize ? 'rgba(15, 61, 62, 0.14)' : colors.border,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          {icon ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                backgroundColor: emphasize
                  ? 'rgba(15, 61, 62, 0.1)'
                  : `${accent}18`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppIcon
                name={icon}
                size={14}
                color={emphasize ? colors.primary : accent}
                strokeWidth={2.4}
              />
            </View>
          ) : (
            <View />
          )}
          {trend ? (
            <Text
              variant="caption"
              color={colors.success}
              style={{fontWeight: '600', fontSize: 11}}>
              {trend}
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            fontFamily: fonts.body,
            fontVariant: ['tabular-nums'],
            fontSize: 28,
            fontWeight: '700',
            lineHeight: 34,
            color: colors.text,
            letterSpacing: -0.5,
          }}>
          {value}
        </Text>
        <Text
          variant="caption"
          color={colors.neutral500}
          style={{marginTop: 2, fontWeight: '600'}}>
          {label}
        </Text>
      </View>
    </Animate>
  );
}

export default StatCard;
