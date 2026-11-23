import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '@/theme';
import {AppIcon, Text} from '@/components/ui';
import {formatDateTime, capitalize} from '@/utils/format';
import type {TimelineEvent, User} from '@/types';

interface TimelineProps {
  events: TimelineEvent[];
}

function getActorName(actor: User | string | undefined): string {
  if (!actor) return 'System';
  if (typeof actor === 'string') return 'User';
  return actor.name;
}

export function Timeline({events}: TimelineProps) {
  const {colors, spacing} = useTheme();

  if (!events.length) {
    return (
      <Text variant="bodySmall" muted center style={{padding: spacing.lg}}>
        No timeline events yet.
      </Text>
    );
  }

  return (
    <View style={{paddingVertical: spacing.sm}}>
      {events.map((event, index) => {
        const action = event.action || event.status || 'update';
        const description = event.description || event.note;
        const actor = event.performedBy || event.by;
        const at = event.createdAt || event.at || '';
        const key = event._id || `${action}-${at}-${index}`;

        return (
          <View key={key} style={styles.item}>
            <View style={styles.lineCol}>
              <View style={[styles.dot, {backgroundColor: colors.primary}]} />
              {index < events.length - 1 ? (
                <View style={[styles.line, {backgroundColor: colors.border}]} />
              ) : null}
            </View>
            <View
              style={{
                flex: 1,
                paddingBottom: spacing.lg,
                paddingLeft: spacing.sm,
              }}>
              <Text variant="label">{capitalize(action)}</Text>
              {description ? (
                <Text variant="bodySmall" secondary style={{marginTop: 2}}>
                  {description}
                </Text>
              ) : null}
              <View
                style={[
                  styles.meta,
                  {marginTop: spacing.xs},
                ]}>
                <AppIcon name="user" size={12} color={colors.textMuted} />
                <Text variant="caption" muted>
                  {getActorName(actor as User)}
                </Text>
                <Text variant="caption" muted>
                  ·
                </Text>
                <Text variant="caption" muted>
                  {at ? formatDateTime(at) : ''}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    minHeight: 60,
  },
  lineCol: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default Timeline;
