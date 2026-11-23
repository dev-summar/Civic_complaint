import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {TouchableOpacity} from './TouchableOpacity';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {AppIcon} from './AppIcon';
import {Text} from './Text';
import {BrandWordmark} from './BrandWordmark';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  transparent?: boolean;
  /**
   * Show Rabta wordmark above the title.
   * Defaults to true when there's no back button (tab roots / brand surfaces).
   */
  showBrand?: boolean;
  /** Tinted rounded panel — same language as citizen Home header */
  panel?: boolean;
}

export function Header({
  title,
  subtitle,
  onBack,
  rightAction,
  style,
  transparent,
  showBrand,
  panel = false,
}: HeaderProps) {
  const {colors, spacing, isDark} = useTheme();
  const brand = showBrand ?? !onBack;

  if (panel) {
    return (
      <View
        style={[
          {
            backgroundColor: isDark ? 'rgba(61, 138, 139, 0.12)' : '#EAF2F1',
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 20,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            borderBottomWidth: 1,
            borderBottomColor: isDark
              ? 'rgba(61, 138, 139, 0.2)'
              : 'rgba(15, 61, 62, 0.08)',
            marginBottom: spacing.sm,
          },
          style,
        ]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
          <View style={{flex: 1, paddingRight: rightAction || onBack ? 12 : 0}}>
            {brand ? <BrandWordmark size="md" /> : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginTop: brand ? 4 : 0,
              }}>
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={10}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: isDark
                      ? 'rgba(61, 138, 139, 0.2)'
                      : 'rgba(15, 61, 62, 0.1)',
                  }}>
                  <AppIcon name="chevron-left" size={22} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
              <View style={{flex: 1, minWidth: 0}}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: onBack ? 24 : 28,
                    fontWeight: '700',
                    lineHeight: onBack ? 30 : 34,
                    letterSpacing: -0.3,
                    color: colors.primary,
                  }}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text
                    style={{
                      marginTop: 6,
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: colors.neutral500,
                      maxWidth: 320,
                      lineHeight: 20,
                    }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          {rightAction}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          backgroundColor: transparent ? 'transparent' : colors.surface,
          borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        style,
      ]}>
      {brand ? (
        <View style={{marginBottom: 8}}>
          <BrandWordmark size="sm" />
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            flex: 1,
          }}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.primarySoft,
              }}>
              <AppIcon name="chevron-left" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : null}
          <View style={{flex: 1}}>
            <Text
              variant="h3"
              style={{fontFamily: fonts.display, color: colors.primary}}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="caption" color={colors.neutral500} style={{marginTop: 2}}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        {rightAction}
      </View>
    </View>
  );
}

export default Header;
