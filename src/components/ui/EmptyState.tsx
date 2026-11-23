import React from 'react';
import {View} from 'react-native';
import {useTheme} from '@/theme';
import {AppIcon, IconName} from './AppIcon';
import {Text} from './Text';
import Button from './Button';
import {Animate} from './Animate';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'file-text',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const {colors, spacing} = useTheme();

  return (
    <Animate from="up">
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xxl,
        }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
          }}>
          <AppIcon name={icon} size={36} color={colors.primary} />
        </View>
        <Text variant="h3" center>
          {title}
        </Text>
        {message ? (
          <Text
            variant="bodySmall"
            secondary
            center
            style={{marginTop: spacing.sm, maxWidth: 280}}>
            {message}
          </Text>
        ) : null}
        {actionLabel && onAction ? (
          <Button
            title={actionLabel}
            onPress={onAction}
            style={{marginTop: spacing.xl, minWidth: 180}}
          />
        ) : null}
      </View>
    </Animate>
  );
}

export default EmptyState;
