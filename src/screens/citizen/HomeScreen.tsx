import React, {useCallback, useState} from 'react';
import {View, FlatList, Platform} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
  Screen,
  Text,
  AppIcon,
  Animate,
  EmptyState,
  StatCard,
  PressableScale,
  BrandWordmark } from '@/components/ui';
import {ComplaintCard, SetuAvatar} from '@/components/complaints';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {useAuthStore} from '@/store/authStore';
import {useComplaintStore} from '@/store/complaintStore';
import {useAppStore} from '@/store/appStore';
import * as notificationService from '@/services/notification.service';
import {getCleanCityScore} from '@/services/engagement.service';
import type {CleanCityScore, Complaint} from '@/types';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CitizenStackParamList} from '@/navigation/types';

function openSetu(
  navigation: NativeStackNavigationProp<CitizenStackParamList>,
) {
  (navigation.getParent<NativeStackNavigationProp<CitizenStackParamList>>() ?? navigation)
    .navigate('ReportChat');
}

function SetuReportCta({
  onPress,
  inset = true,
}: {
  onPress: () => void;
  inset?: boolean;
}) {
  const {colors, spacing, radius, isDark} = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Talk to Setu Assistant"
      accessibilityHint="Speak or type a report in English, Hindi, Hinglish, Urdu, Kashmiri, or Dogri"
      onPress={onPress}
      contentStyle={{
        marginHorizontal: inset ? spacing.lg : 0,
        backgroundColor: colors.primary,
        borderRadius: 22,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(61,138,134,0.35)' : 'rgba(15,61,58,0.12)',
        minHeight: 96,
      }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        <SetuAvatar mood="idle" size={68} />
      </View>

      <View style={{flex: 1, minWidth: 0, gap: 4}}>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            fontWeight: '700',
            lineHeight: 24,
            color: '#FFFFFF',
          }}>
          Talk to Setu
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            lineHeight: 20,
            color: 'rgba(255,255,255,0.88)',
          }}>
          Speak or type — Setu files your report with you.
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 16,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 2,
          }}>
          English · हिन्दी · اردو · کٲشُر · डोगरी
        </Text>
      </View>

      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: colors.action,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <AppIcon name="mic" size={22} color="#FFFFFF" strokeWidth={2.4} />
      </View>
    </PressableScale>
  );
}

function FormReportLink({
  onPress,
  inset = true,
}: {
  onPress: () => void;
  inset?: boolean;
}) {
  const {colors, spacing} = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Use the report form instead"
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={6}
      style={{
        marginHorizontal: inset ? spacing.lg : 0,
        marginTop: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        minHeight: 48,
      }}>
      <AppIcon name="file-text" size={18} color={colors.primary} />
      <Text
        variant="bodySmall"
        color={colors.text}
        style={{flex: 1, fontWeight: '600'}}>
        Prefer a form? Report step by step
      </Text>
      <AppIcon name="chevron-right" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function RecentActivity({
  complaints,
  inset,
  onSeeAll,
  onOpen,
  onReport,
}: {
  complaints: Complaint[];
  inset: boolean;
  onSeeAll: () => void;
  onOpen: (id: string) => void;
  onReport: () => void;
}) {
  const {colors, spacing} = useTheme();
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: inset ? spacing.lg : 0,
          marginTop: 28,
          marginBottom: 14,
        }}>
        <Text variant="h2" style={{fontFamily: fonts.display}}>
          Recent activity
        </Text>
        <TouchableOpacity
          onPress={onSeeAll}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="See all reports">
          <Text variant="caption" color={colors.action} style={{fontWeight: '700'}}>
            See all
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          paddingHorizontal: inset ? spacing.lg : 0,
          paddingBottom: Platform.OS === 'web' ? 32 : 16,
        }}>
        <FlatList
          removeClippedSubviews={false}
          data={complaints.slice(0, 5)}
          keyExtractor={item => item._id}
          scrollEnabled={false}
          renderItem={({item, index}) => (
            <ComplaintCard
              complaint={item}
              index={index}
              onPress={() => onOpen(item._id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="mic"
              title="Nothing here yet"
              message="Tell Setu what’s wrong — your first report will show up here."
              actionLabel="Talk to Setu"
              onAction={onReport}
            />
          }
        />
      </View>
    </>
  );
}

export default function HomeScreen() {
  const {colors, spacing, isDark} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<CitizenStackParamList>>();
  const user = useAuthStore(s => s.user);
  const complaints = useComplaintStore(s => s.complaints);
  const fetchMine = useComplaintStore(s => s.fetchMine);
  const unread = useAppStore(s => s.unreadNotifications);
  const setUnread = useAppStore(s => s.setUnreadNotifications);
  const [score, setScore] = useState<CleanCityScore | null>(null);
  const desktop = useDesktopLayout();

  useFocusEffect(
    useCallback(() => {
      fetchMine();
      notificationService.getUnreadCount().then(setUnread).catch(() => {});
      getCleanCityScore().then(setScore).catch(() => {});
    }, [fetchMine, setUnread]),
  );

  const open = complaints.filter(
    c => !['resolved', 'closed', 'rejected'].includes(c.status),
  );
  const resolved = complaints.filter(c => ['resolved', 'closed'].includes(c.status));
  const firstName = user?.name?.split(' ')[0] ?? 'Citizen';
  const goSetu = () => openSetu(navigation);
  const goForm = () => navigation.navigate('Tabs', {screen: 'Report'});

  return (
    <Screen scroll onRefresh={fetchMine} edges={['top']}>
      <View
        style={{
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
          marginBottom: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start' }}>
          <View style={{flex: 1, paddingRight: 14, maxWidth: 420}}>
            <BrandWordmark size="md" />
            <Text
              style={{
                marginTop: 4,
                fontFamily: fonts.display,
                fontSize: 30,
                fontWeight: '700',
                lineHeight: 36,
                letterSpacing: -0.4,
                color: colors.primary }}>
              Hey, {firstName}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontFamily: fonts.body,
                fontSize: 15,
                fontWeight: '400',
                lineHeight: 22,
                color: colors.neutral500,
                maxWidth: 300 }}>
              Spot something? Talk to Setu — report in under a minute.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.85}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              unread > 0
                ? `Notifications, ${unread} unread`
                : 'Notifications'
            }
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: isDark
                ? 'rgba(61, 138, 139, 0.2)'
                : 'rgba(15, 61, 62, 0.1)',
              alignItems: 'center',
              justifyContent: 'center' }}>
            <AppIcon name="bell" size={18} color={colors.primary} />
            {unread > 0 ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.action,
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(61, 138, 139, 0.12)' : '#EAF2F1' }}
              />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={
          desktop
            ? {
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 28,
                paddingHorizontal: 20,
              }
            : undefined
        }>
      <View style={desktop ? {flex: 1.45, minWidth: 0} : undefined}>
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: desktop ? 0 : spacing.lg,
          marginTop: spacing.sm,
          marginBottom: spacing.xl }}>
        <StatCard
          label="Open"
          value={open.length}
          icon="alert-triangle"
          emphasize
          color={colors.warning}
          index={0}
        />
        <StatCard
          label="Resolved"
          value={resolved.length}
          icon="check-circle"
          color={colors.success}
          index={1}
        />
        <StatCard
          label="Total"
          value={complaints.length}
          icon="layers"
          color={colors.primary}
          index={2}
        />
      </View>
      {desktop ? (
        <RecentActivity
          complaints={complaints}
          inset={false}
          onSeeAll={() => navigation.navigate('Tabs', {screen: 'History'})}
          onOpen={id => navigation.navigate('ComplaintDetail', {id})}
          onReport={goSetu}
        />
      ) : null}
      </View>
      <View style={desktop ? {width: 360} : undefined}>
      <Animate from="up" delay={40}>
        <SetuReportCta inset={!desktop} onPress={goSetu} />
      </Animate>
      <Animate from="fade" delay={80}>
        <FormReportLink inset={!desktop} onPress={goForm} />
      </Animate>

      {score ? (
        <Animate from="up" delay={120}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Clean City Score ${score.score}, grade ${score.grade}`}
            onPress={() => navigation.navigate('Leaderboard')}
            contentStyle={{
              marginHorizontal: desktop ? 0 : spacing.lg,
              marginTop: 16,
              borderRadius: 20,
              padding: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              minHeight: 72,
            }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center' }}>
              <Text style={{fontFamily: fonts.mono, fontSize: 20, fontWeight: '800', color: '#FFFFFF'}}>
                {score.score}
              </Text>
            </View>
            <View style={{flex: 1}}>
              <Text variant="label" style={{fontWeight: '800', color: colors.primary}}>
                Clean City Score · {score.grade}
              </Text>
              <Text variant="caption" color={colors.neutral500} style={{marginTop: 2}}>
                {score.fixed} of {score.total} reports are fixed. The score weighs fixes, confirmations, and how quickly they were closed.
              </Text>
            </View>
            <AppIcon name="trophy" size={20} color={colors.action} />
          </PressableScale>
        </Animate>
      ) : null}
      </View>

      {desktop ? null : (
        <RecentActivity
          complaints={complaints}
          inset
          onSeeAll={() => navigation.navigate('Tabs', {screen: 'History'})}
          onOpen={id => navigation.navigate('ComplaintDetail', {id})}
          onReport={goSetu}
        />
      )}
      </View>
    </Screen>
  );
}
