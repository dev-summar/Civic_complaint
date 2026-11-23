import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {TouchableOpacity} from './TouchableOpacity';
import {useTheme} from '@/theme';
import {AppIcon} from './AppIcon';
import {Text} from './Text';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const {colors, spacing, radius, shadows} = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <View style={styles.fill}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={[styles.backdrop, {backgroundColor: colors.overlay}]}
          />
          <View
            collapsable={false}
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
                paddingBottom: spacing.xxl,
              },
              shadows.lg,
            ]}>
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.divider,
                borderRadius: 2,
                alignSelf: 'center',
                marginTop: spacing.sm,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}>
              {title ? <Text variant="h3" style={{flex: 1, paddingRight: 12}}>{title}</Text> : <View />}
              <TouchableOpacity
                onPress={onClose}
                hitSlop={8}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primarySoft,
                }}>
                <AppIcon name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {flex: 1},
  backdrop: {flex: 1},
  sheet: {maxHeight: '82%'},
});

export default BottomSheet;
