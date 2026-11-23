import React from 'react';
import {
  View,
  ViewStyle,
  RefreshControl,
  StatusBar,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '@/theme';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Desktop web: narrow centers a form, fill uses the whole pane. */
  frame?: 'narrow' | 'fill';
}

export function Screen({
  children,
  scroll = false,
  style,
  contentStyle,
  refreshing,
  onRefresh,
  edges = ['top', 'bottom'],
  frame,
}: ScreenProps) {
  const {colors, isDark} = useTheme();
  const desktop = useDesktopLayout();
  const maxWidth = !desktop || frame === 'fill' ? undefined : frame === 'narrow' ? 520 : 1080;

  const content = scroll ? (
    <ScrollView
      style={{flex: 1}}
      contentContainerStyle={[{flexGrow: 1, paddingBottom: 28}, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
      nestedScrollEnabled
      removeClippedSubviews={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[{flex: 1}, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[{flex: 1, backgroundColor: colors.background}, style]}
      edges={edges}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <View
        style={
          maxWidth
            ? {flex: 1, width: '100%', maxWidth, alignSelf: 'center'}
            : {flex: 1}
        }>
        {content}
      </View>
    </SafeAreaView>
  );
}

export default Screen;
