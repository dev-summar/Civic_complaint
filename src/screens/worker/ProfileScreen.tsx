import React, {useState} from 'react';
import {View, Image} from 'react-native';
import {
  Screen,
  AppIcon,
  Text,
  BottomSheet,
  Button,
  BrandWordmark,
  PressableScale,
} from '@/components/ui';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {useAuthStore} from '@/store/authStore';
import {ROLE_LABELS, BRAND} from '@/constants';
import {getInitials} from '@/utils/format';

export default function WorkerProfileScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const name = user?.name ?? 'Worker';
  const initials = getInitials(name);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <Screen scroll edges={['top']}>
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.xl,
        }}>
        <BrandWordmark size="md" style={{marginBottom: spacing.lg}} />
        {user?.avatar ? (
          <Image
            source={{uri: user.avatar}}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.border,
            }}
          />
        ) : (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              color="#FFFFFF"
              style={{
                fontFamily: fonts.mono,
                fontSize: 26,
                fontWeight: '700',
              }}>
              {initials}
            </Text>
          </View>
        )}
        <Text
          variant="h2"
          style={{marginTop: spacing.md, fontFamily: fonts.display}}
          center>
          {name}
        </Text>
        {user?.role ? (
          <View
            style={{
              marginTop: spacing.sm,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: colors.primarySoft,
            }}>
            <Text
              variant="caption"
              color={colors.primary}
              style={{fontWeight: '700'}}>
              {ROLE_LABELS[user.role]}
            </Text>
          </View>
        ) : null}
      </View>

      <PressableScale
        onPress={() => setLogoutOpen(true)}
        contentStyle={pressed => ({
          marginHorizontal: spacing.lg,
          marginBottom: spacing.xxl,
          minHeight: 50,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.error,
          backgroundColor: pressed ? colors.error : colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          ...shadows.sm,
        })}>
        {pressed => (
          <>
            <AppIcon
              name="logout"
              size={18}
              color={pressed ? '#FFFFFF' : colors.error}
            />
            <Text
              variant="button"
              color={pressed ? '#FFFFFF' : colors.error}
              style={{fontWeight: '700'}}>
              Log out
            </Text>
          </>
        )}
      </PressableScale>

      <BottomSheet
        visible={logoutOpen}
        onClose={() => !loggingOut && setLogoutOpen(false)}
        title={`Log out of ${BRAND.name}?`}>
        <View style={{padding: spacing.lg, gap: spacing.md}}>
          <Text variant="body" color={colors.neutral500}>
            You’ll need to sign in again to see your field jobs.
          </Text>
          <View style={{flexDirection: 'row', gap: 12, marginTop: spacing.sm}}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setLogoutOpen(false)}
              disabled={loggingOut}
              style={{flex: 1}}
            />
            <Button
              title="Log out"
              variant="danger"
              loading={loggingOut}
              onPress={confirmLogout}
              style={{flex: 1}}
            />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}
