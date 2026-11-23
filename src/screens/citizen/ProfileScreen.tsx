import React, {useState} from 'react';
import {View, Linking, Alert, Image} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {CompositeScreenProps} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CitizenStackParamList, CitizenTabParamList} from '@/navigation/types';
import {
  Screen,
  Card,
  AppIcon,
  Text,
  BottomSheet,
  Button,
  IconName,
  PressableScale } from '@/components/ui';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {useAuthStore} from '@/store/authStore';
import {ROLE_LABELS, BRAND} from '@/constants';
import {formatPhone, getInitials} from '@/utils/format';

type Props = CompositeScreenProps<
  BottomTabScreenProps<CitizenTabParamList, 'Profile'>,
  NativeStackScreenProps<CitizenStackParamList>
>;

type MenuItem = {
  icon: IconName;
  label: string;
  badgeBg: string;
  badgeColor: string;
  onPress: () => void;
};

export default function ProfileScreen({navigation}: Props) {
  const {colors, spacing, radius, shadows} = useTheme();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const openHelp = () => {
    Alert.alert(
      'Help & Support',
      `Need assistance with ${BRAND.name}?\n\nEmail: ${BRAND.supportEmail}\nHelpline: 1800-XXX-XXXX`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Email support',
          onPress: () =>
            Linking.openURL(`mailto:${BRAND.supportEmail}`).catch(() => {}) },
      ],
    );
  };

  const menu: MenuItem[] = [
    {
      icon: 'trophy',
      label: 'Clean City Score & Leaderboard',
      badgeBg: `${colors.action}1F`,
      badgeColor: colors.action,
      onPress: () => navigation.navigate('Leaderboard') },
    {
      icon: 'settings',
      label: 'Settings',
      badgeBg: `${colors.neutral500}1F`,
      badgeColor: '#3D4A47',
      onPress: () => navigation.navigate('Settings') },
    {
      icon: 'map-pin',
      label: 'Saved Locations',
      badgeBg: colors.primarySoft,
      badgeColor: colors.primary,
      onPress: () => navigation.navigate('SavedLocations') },
    {
      icon: 'bell',
      label: 'Notifications',
      badgeBg: `${colors.action}1F`,
      badgeColor: colors.action,
      onPress: () => navigation.navigate('Notifications') },
    {
      icon: 'circle-help',
      label: 'Help & Support',
      badgeBg: `${colors.info}1F`,
      badgeColor: colors.info,
      onPress: openHelp },
  ];

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const name = user?.name ?? 'User';
  const initials = getInitials(name);

  return (
    <Screen scroll edges={['top']}>
      {/* Calm identity block — plain bg, no gradient */}
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xl }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Settings')}
          style={{position: 'relative', marginBottom: spacing.md}}>
          {user?.avatar ? (
            <Image
              source={{uri: user.avatar}}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.border }}
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center' }}>
              <Text
                color="#FFFFFF"
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 26,
                  fontWeight: '700',
                  letterSpacing: 0.5 }}>
                {initials}
              </Text>
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: colors.action,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.background }}>
            <AppIcon name="pencil" size={12} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        <Text
          variant="h2"
          style={{fontFamily: fonts.display, fontWeight: '700'}}
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
              backgroundColor: colors.primarySoft }}>
            <Text
              variant="caption"
              color={colors.primary}
              style={{fontWeight: '700', fontSize: 12}}>
              {ROLE_LABELS[user.role] ?? 'Citizen'}
            </Text>
          </View>
        ) : null}

        {user?.email ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: spacing.md }}>
            <AppIcon name="mail" size={14} color={colors.neutral500} />
            <Text variant="body" color={colors.neutral500}>
              {user.email}
            </Text>
          </View>
        ) : null}

        {user?.phone ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 6 }}>
            <AppIcon name="phone" size={14} color={colors.neutral500} />
            <Text variant="body" color={colors.neutral500}>
              {formatPhone(user.phone)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Grouped settings card */}
      <Card
        padded={false}
        elevated
        style={{
          marginHorizontal: spacing.lg,
          borderRadius: radius.lg,
          overflow: 'hidden' }}>
        {menu.map((item, index) => {
          const isLast = index === menu.length - 1;
          return (
            <PressableScale
              key={item.label}
              onPress={item.onPress}
              contentStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: colors.border }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: item.badgeBg,
                  alignItems: 'center',
                  justifyContent: 'center' }}>
                <AppIcon
                  name={item.icon}
                  size={20}
                  color={item.badgeColor}
                  strokeWidth={2.2}
                />
              </View>
              <Text variant="body" style={{flex: 1, fontWeight: '600'}}>
                {item.label}
              </Text>
              <AppIcon name="chevron-right" size={18} color={colors.neutral500} />
            </PressableScale>
          );
        })}
      </Card>

      {/* Destructive logout — outline until pressed */}
      <PressableScale
        onPress={() => setLogoutOpen(true)}
        contentStyle={pressed => ({
          marginHorizontal: spacing.lg,
          marginTop: spacing.xl,
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
          ...shadows.sm })}>
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
            You’ll need to sign in again to report issues or track your
            complaints.
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
