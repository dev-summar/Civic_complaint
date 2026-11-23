import React from 'react';
import {View, ScrollView} from 'react-native';
import {useTheme} from '@/theme';
import {AppIcon, Text, Animate, StatusTrail, PressableScale} from '@/components/ui';
import {CATEGORY_META} from '@/constants';
import {STATUS_TRAIL_LABELS, STATUS_TRAIL_STAGES, statusToTrailIndex} from '@/theme';
import {formatDate, truncate} from '@/utils/format';
import {MOTION} from '@/utils/motion';
import type {Complaint} from '@/types';

interface ComplaintCardProps {
  complaint: Complaint;
  onPress: () => void;
  index?: number;
  variant?: 'home' | 'history';
  showAssignee?: boolean;
}

export function ComplaintCard({
  complaint,
  onPress,
  index = 0,
  variant = 'home',
  showAssignee = false,
}: ComplaintCardProps) {
  const {colors, shadows, radius} = useTheme();
  const cat = CATEGORY_META[complaint.category] ?? CATEGORY_META.others;
  const stage = STATUS_TRAIL_STAGES[statusToTrailIndex(complaint.status)] ?? 'submitted';
  const stageLabel = complaint.status === 'rejected' ? 'Rejected' : STATUS_TRAIL_LABELS[stage];
  const isHistory = variant === 'history';

  return (
    <Animate from="up" delay={Math.min(index * MOTION.stagger, 200)}>
      <PressableScale onPress={onPress} contentStyle={{marginBottom: 12}}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            padding: 14,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.card,
          }}>
          {isHistory ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  backgroundColor: `${cat.color}1F`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppIcon
                  name={cat.icon}
                  size={22}
                  color={cat.color}
                  strokeWidth={2.4}
                />
              </View>

              <View style={{flex: 1, minWidth: 0}}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}>
                  <Text
                    variant="label"
                    numberOfLines={1}
                    style={{fontWeight: '700', flex: 1}}>
                    {complaint.title}
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.neutral500}
                    style={{fontSize: 11, marginTop: 2}}>
                    {formatDate(complaint.createdAt)}
                  </Text>
                </View>
                <Text
                  variant="caption"
                  color={colors.neutral500}
                  numberOfLines={2}
                  style={{marginTop: 4}}>
                  {truncate(complaint.description, 100)}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{marginTop: 10}}
                  contentContainerStyle={{minWidth: '100%'}}>
                  <View style={{minWidth: 280, flexGrow: 1}}>
                    <StatusTrail
                      status={complaint.status}
                      size="full"
                      currentTimestamp={
                        complaint.updatedAt || complaint.createdAt
                      }
                    />
                  </View>
                </ScrollView>
              </View>

              <AppIcon name="chevron-right" size={20} color={colors.neutral500} />
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  backgroundColor: `${cat.color}1F`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppIcon
                  name={cat.icon}
                  size={22}
                  color={cat.color}
                  strokeWidth={2.4}
                />
              </View>

              <View style={{flex: 1, gap: 4}}>
                <Text variant="label" numberOfLines={1} style={{fontWeight: '700'}}>
                  {complaint.title}
                </Text>
                <Text variant="caption" color={colors.neutral500} numberOfLines={1}>
                  {truncate(complaint.description, 80)}
                </Text>
                {showAssignee ? (
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4}}>
                    <AppIcon name="user" size={14} color={colors.primary} />
                    <Text variant="caption" color={colors.text} style={{flex: 1}}>
                      {complaint.workerName ? 'Assigned to ' + complaint.workerName : 'Awaiting worker assignment'}
                    </Text>
                  </View>
                ) : null}
                <View style={{marginTop: 6, gap: 6}}>
                  <Text variant="caption" color={colors.primary} style={{fontWeight: '800'}}>
                    {stageLabel}
                  </Text>
                  <StatusTrail status={complaint.status} size="compact" />
                  <Text
                    variant="caption"
                    color={colors.neutral500}
                    style={{fontSize: 11}}>
                    {formatDate(complaint.createdAt)}
                  </Text>
                </View>
              </View>

              <AppIcon name="chevron-right" size={20} color={colors.neutral500} />
            </View>
          )}
        </View>
      </PressableScale>
    </Animate>
  );
}

export default ComplaintCard;
