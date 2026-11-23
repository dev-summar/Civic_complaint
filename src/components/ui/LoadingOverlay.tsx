import React from 'react';
import {View, ActivityIndicator, Modal} from 'react-native';
import {useTheme} from '@/theme';
import {Text} from './Text';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({visible, message}: LoadingOverlayProps) {
  const {colors, spacing, radius, shadows} = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <View
          style={{
            backgroundColor: colors.surface,
            padding: spacing.xxl,
            borderRadius: radius.xl,
            alignItems: 'center',
            minWidth: 160,
            ...shadows.lg,
          }}>
          <ActivityIndicator size="large" color={colors.primary} />
          {message ? (
            <Text variant="bodySmall" secondary style={{marginTop: spacing.md}}>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default LoadingOverlay;
