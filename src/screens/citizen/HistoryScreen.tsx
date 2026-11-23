import React, {useCallback, useMemo, useState} from 'react';
import {View, FlatList, ScrollView, RefreshControl} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Screen, EmptyState, Text, AppIcon, Animate} from '@/components/ui';
import {ComplaintCard} from '@/components/complaints';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {useComplaintStore} from '@/store/complaintStore';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CitizenStackParamList} from '@/navigation/types';

type FilterKey = 'all' | 'open' | 'resolved';

function DoneEmpty() {
  const {colors, spacing} = useTheme();
  return (
    <Animate from="up">
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.xl,
        }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: `${colors.success}40`,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.lg,
            backgroundColor: `${colors.success}12`,
          }}>
          <AppIcon name="check-circle" size={40} color={colors.success} strokeWidth={1.6} />
        </View>
        <Text
          variant="body"
          center
          style={{fontWeight: '700', color: colors.text}}>
          Nothing resolved yet
        </Text>
        <Text
          variant="bodySmall"
          color={colors.neutral500}
          center
          style={{marginTop: spacing.sm, maxWidth: 280, lineHeight: 20}}>
          Resolved complaints will show up here once your local body closes them
          out
        </Text>
      </View>
    </Animate>
  );
}

export default function HistoryScreen() {
  const {colors, spacing, isDark} = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<CitizenStackParamList>>();
  const complaints = useComplaintStore(s => s.complaints);
  const fetchMine = useComplaintStore(s => s.fetchMine);
  const isLoading = useComplaintStore(s => s.isLoading);
  const [filter, setFilter] = useState<FilterKey>('all');

  useFocusEffect(
    useCallback(() => {
      fetchMine();
    }, [fetchMine]),
  );

  const filtered = useMemo(() => {
    if (filter === 'open') {
      return complaints.filter(
        c => !['resolved', 'closed', 'rejected'].includes(c.status),
      );
    }
    if (filter === 'resolved') {
      return complaints.filter(c =>
        ['resolved', 'closed'].includes(c.status),
      );
    }
    return complaints;
  }, [complaints, filter]);

  const chips: {key: FilterKey; label: string; count: number}[] = [
    {key: 'all', label: 'All', count: complaints.length},
    {
      key: 'open',
      label: 'Open',
      count: complaints.filter(
        c => !['resolved', 'closed', 'rejected'].includes(c.status),
      ).length,
    },
    {
      key: 'resolved',
      label: 'Done',
      count: complaints.filter(c =>
        ['resolved', 'closed'].includes(c.status),
      ).length,
    },
  ];

  const goSetu = () =>
    (navigation.getParent<NativeStackNavigationProp<CitizenStackParamList>>() ?? navigation)
      .navigate('ReportChat');

  return (
    <Screen edges={['top']} scroll={false} style={{flex: 1}}>
      <View
        style={{
          backgroundColor: isDark ? 'rgba(61, 138, 139, 0.12)' : '#EAF2F1',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderBottomWidth: 1,
          borderBottomColor: isDark
            ? 'rgba(61, 138, 139, 0.2)'
            : 'rgba(15, 61, 62, 0.08)',
        }}>
        <Text
          variant="caption"
          color={colors.neutral500}
          style={{
            fontFamily: fonts.mono,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontSize: 11,
          }}>
          Your reports
        </Text>
        <Text
          style={{
            marginTop: 6,
            fontFamily: fonts.display,
            fontSize: 28,
            fontWeight: '700',
            lineHeight: 34,
            letterSpacing: -0.3,
            color: colors.primary,
          }}>
          History
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontFamily: fonts.body,
            fontSize: 15,
            lineHeight: 22,
            color: colors.neutral500,
          }}>
          Follow every report from Setu to fixed
        </Text>
      </View>

      {/* Underline filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          gap: 20,
          paddingTop: spacing.sm,
        }}
        style={{
          flexGrow: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}>
        {chips.map(c => {
          const active = filter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setFilter(c.key)}
              activeOpacity={0.8}
              style={{
                paddingBottom: 12,
                borderBottomWidth: 2,
                borderBottomColor: active ? colors.action : 'transparent',
                marginBottom: -1,
              }}>
              <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6}}>
                <Text
                  variant="label"
                  color={active ? colors.primary : colors.neutral500}
                  style={{
                    fontWeight: active ? '800' : '500',
                    fontSize: 15,
                  }}>
                  {c.label}
                </Text>
                <Text
                  variant="caption"
                  color={active ? colors.primary : colors.neutral500}
                  style={{
                    fontFamily: fonts.mono,
                    fontWeight: '700',
                    fontSize: 12,
                  }}>
                  {c.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList removeClippedSubviews={false}
        data={filtered}
        keyExtractor={item => item._id}
        contentContainerStyle={{
          padding: spacing.lg,
          flexGrow: 1,
          paddingBottom: 28,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMine}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({item, index}) => (
          <ComplaintCard
            complaint={item}
            index={index}
            variant="history"
            onPress={() =>
              navigation.navigate('ComplaintDetail', {id: item._id})
            }
          />
        )}
        ListEmptyComponent={
          filter === 'resolved' ? (
            <DoneEmpty />
          ) : (
            <EmptyState
              icon="mic"
              title={
                filter === 'open' ? 'No open reports' : 'Nothing to track yet'
              }
              message={
                filter === 'all'
                  ? 'Tell Setu what’s wrong — your reports will show up here with live status.'
                  : 'Nothing in this filter yet.'
              }
              actionLabel={filter === 'all' ? 'Talk to Setu' : undefined}
              onAction={filter === 'all' ? goSetu : undefined}
            />
          )
        }
      />
    </Screen>
  );
}
