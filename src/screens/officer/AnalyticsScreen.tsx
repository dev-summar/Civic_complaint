import React, {useCallback, useMemo, useState} from 'react';
import {View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Screen,
  Header,
  StatCard,
  Card,
  Text,
  EmptyState,
  AppIcon,
} from '@/components/ui';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {CATEGORY_META} from '@/constants';
import {formatCoords} from '@/utils/format';
import * as dashboardService from '@/services/dashboard.service';
import {formatHours} from '@/services/engagement.service';
import type {Hotspot} from '@/types';

type CategoryRow = {_id: string; count: number};

function normalizeCategory(raw: unknown): {key: string; count: number}[] {
  if (!Array.isArray(raw)) {
    if (raw && typeof raw === 'object') {
      return Object.entries(raw as Record<string, number>).map(([key, count]) => ({
        key,
        count: Number(count) || 0,
      }));
    }
    return [];
  }
  return (raw as CategoryRow[]).map(row => ({
    key: String(row?._id ?? 'unknown'),
    count: Number(row?.count) || 0,
  }));
}

function normalizeStatus(raw: unknown): {key: string; count: number}[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    if (Array.isArray(raw)) {
      return (raw as CategoryRow[]).map(row => ({
        key: String(row?._id ?? 'unknown'),
        count: Number(row?.count) || 0,
      }));
    }
    return [];
  }
  return Object.entries(raw as Record<string, number>).map(([key, count]) => ({
    key,
    count: Number(count) || 0,
  }));
}

export default function AnalyticsScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    dashboardService
      .getComplaintAnalytics()
      .then(setData)
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const byCategory = useMemo(
    () => normalizeCategory(data?.byCategory),
    [data],
  );
  const byStatus = useMemo(() => normalizeStatus(data?.byStatus), [data]);

  const total = useMemo(
    () => byStatus.reduce((sum, row) => sum + row.count, 0),
    [byStatus],
  );

  const avgLabel = formatHours(data?.avgResolutionHours as number | null | undefined);
  const assignLabel = formatHours(data?.avgAssignHours as number | null | undefined);
  const hotspots = (Array.isArray(data?.hotspots) ? data?.hotspots : []) as Hotspot[];

  return (
    <Screen scroll edges={['top']} refreshing={loading} onRefresh={load}>
      <Header
        panel
        title="Analytics"
        subtitle="Handling speed, trouble spots, and trends"
      />

      {error ? (
        <EmptyState
          icon="alert-triangle"
          title="Analytics unavailable"
          message={error}
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.md,
            }}>
            <StatCard
              label="Total"
              value={total}
              icon="bar-chart"
              emphasize
              index={0}
            />
            <StatCard
              label="Avg resolution"
              value={avgLabel}
              icon="clock"
              index={1}
            />
            <StatCard
              label="Resolved"
              value={Number(data?.resolvedCount) || 0}
              icon="check-circle"
              index={2}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.md,
            }}>
            <StatCard label="Avg to assign" value={assignLabel} icon="timer" index={3} />
            <StatCard
              label={`Overdue >${Number(data?.overdueAfterHours) || 72}h`}
              value={Number(data?.overdue) || 0}
              icon="alert-triangle"
              index={4}
            />
            <StatCard
              label="Citizen confirmed"
              value={Number(data?.closed) || 0}
              icon="users"
              index={5}
            />
          </View>
          {Number(data?.reopened) > 0 ? (
            <Text
              variant="caption"
              color={colors.neutral500}
              style={{paddingHorizontal: spacing.lg, marginBottom: spacing.md}}>
              {Number(data?.reopened)} complaint(s) were reopened by citizens after being marked resolved.
            </Text>
          ) : null}

          <View style={{paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 16}}>
            {hotspots.length ? (
              <View>
                <Text
                  variant="label"
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: '700',
                    marginBottom: 4,
                    color: colors.primary,
                  }}>
                  Recurring trouble spots
                </Text>
                <Text variant="caption" color={colors.neutral500} style={{marginBottom: spacing.sm}}>
                  Places with two or more complaints within about 100 m.
                </Text>
                {hotspots.map(spot => {
                  const meta = CATEGORY_META[spot.topCategory as keyof typeof CATEGORY_META] ?? CATEGORY_META.others;
                  return (
                    <Card
                      key={`${spot.latitude},${spot.longitude}`}
                      elevated
                      style={{
                        marginBottom: 8,
                        borderRadius: radius.lg,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                      <AppIcon name="flame" size={22} color={spot.open > 0 ? colors.action : colors.neutral500} />
                      <View style={{flex: 1}}>
                        <Text variant="body" style={{fontWeight: '700'}} numberOfLines={1}>
                          {spot.address || formatCoords(spot.latitude, spot.longitude)}
                        </Text>
                        <Text variant="caption" color={colors.neutral500}>
                          Mostly {meta.label.toLowerCase()} · {spot.open} still open
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: fonts.mono,
                          fontWeight: '700',
                          fontSize: 16,
                          color: colors.primary,
                        }}>
                        {spot.total}
                      </Text>
                    </Card>
                  );
                })}
              </View>
            ) : null}

            <View>
              <Text
                variant="label"
                style={{
                  fontFamily: fonts.display,
                  fontWeight: '700',
                  marginBottom: spacing.sm,
                  color: colors.primary,
                }}>
                By category
              </Text>
              {byCategory.length === 0 ? (
                <Text variant="bodySmall" color={colors.neutral500}>
                  No category data yet.
                </Text>
              ) : (
                byCategory.map(row => (
                  <Card
                    key={row.key}
                    elevated
                    style={{
                      marginBottom: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderRadius: radius.lg,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                    }}>
                    <Text
                      variant="body"
                      style={{textTransform: 'capitalize', flex: 1}}>
                      {row.key.replace(/_/g, ' ')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.mono,
                        fontWeight: '700',
                        fontSize: 16,
                        color: colors.primary,
                      }}>
                      {row.count}
                    </Text>
                  </Card>
                ))
              )}
            </View>

            <View>
              <Text
                variant="label"
                style={{
                  fontFamily: fonts.display,
                  fontWeight: '700',
                  marginBottom: spacing.sm,
                  color: colors.primary,
                }}>
                By status
              </Text>
              {byStatus.length === 0 ? (
                <Text variant="bodySmall" color={colors.neutral500}>
                  No status data yet.
                </Text>
              ) : (
                byStatus.map(row => (
                  <Card
                    key={row.key}
                    elevated
                    style={{
                      marginBottom: 8,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderRadius: radius.lg,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      ...shadows.sm,
                    }}>
                    <Text
                      variant="body"
                      style={{textTransform: 'capitalize', flex: 1}}>
                      {row.key.replace(/_/g, ' ')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.mono,
                        fontWeight: '700',
                        fontSize: 16,
                        color: colors.primary,
                      }}>
                      {row.count}
                    </Text>
                  </Card>
                ))
              )}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}
