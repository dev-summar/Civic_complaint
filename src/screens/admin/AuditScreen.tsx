import React, {useEffect, useState, useCallback} from 'react';
import {View, FlatList, StyleSheet, RefreshControl} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList} from '@/navigation/types';
import {useTheme} from '@/theme';
import {Screen, Header, Card, Badge, EmptyState, Text, AppIcon, Skeleton} from '@/components/ui';
import {getAuditLogs, AuditLogEntry} from '@/services/audit.service';
import {formatDistanceToNow} from 'date-fns';

type Props = NativeStackScreenProps<AdminStackParamList, 'Audit'>;

export default function AuditScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async () => {
    try {
      const data = await getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchLogs();
  }, []);

  const getActionBadgeVariant = (action: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    const act = action.toLowerCase();
    if (act.includes('create')) return 'success';
    if (act.includes('delete')) return 'error';
    if (act.includes('update') || act.includes('assign') || act.includes('resolve')) return 'warning';
    if (act.includes('login') || act.includes('logout') || act.includes('export')) return 'info';
    return 'default';
  };

  const getActionIcon = (action: string): string => {
    const act = action.toLowerCase();
    if (act.includes('create')) return 'plus-circle';
    if (act.includes('delete')) return 'trash-2';
    if (act.includes('update')) return 'edit-3';
    if (act.includes('login')) return 'log-in';
    if (act.includes('logout')) return 'log-out';
    if (act.includes('assign')) return 'user-check';
    if (act.includes('resolve')) return 'check-circle';
    if (act.includes('export')) return 'download';
    return 'activity';
  };

  const renderItem = ({item}: {item: AuditLogEntry}) => {
    const actorName =
      item.actor && typeof item.actor === 'object' ? item.actor.name : 'System';
    const actorRole =
      item.actor && typeof item.actor === 'object' ? item.actor.role : undefined;

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.actorRow}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm,
              }}>
              <AppIcon
                name={getActionIcon(item.action) as any}
                size={16}
                color={colors.primary}
              />
            </View>
            <View>
              <Text variant="label">{actorName}</Text>
              {actorRole ? (
                <Text variant="caption" secondary>
                  {actorRole}
                </Text>
              ) : null}
            </View>
          </View>
          <Badge
            variant={getActionBadgeVariant(item.action)}
            label={item.action.toUpperCase()}
          />
        </View>

        <View style={{marginTop: spacing.sm}}>
          <Text variant="bodySmall" secondary>
            Resource: {item.resource}
            {item.resourceId ? ` (${item.resourceId.slice(-8)})` : ''}
          </Text>
          {item.ip ? (
            <View style={[styles.metaRow, {marginTop: spacing.xs}]}>
              <AppIcon name="globe" size={12} color={colors.neutral500} />
              <Text
                variant="caption"
                color={colors.neutral500}
                style={{marginLeft: 4}}>
                {item.ip}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.cardFooter,
            {borderTopColor: colors.border, marginTop: spacing.sm},
          ]}>
          <Text variant="caption" color={colors.neutral500}>
            {formatDistanceToNow(new Date(item.createdAt), {addSuffix: true})}
          </Text>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <Header
          title="Audit Trail"
          subtitle="System activity log"
          onBack={() => navigation.goBack()}
        />
        <View style={{padding: spacing.lg, gap: spacing.md}}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} height={120} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title="Audit Trail"
        subtitle="System activity log"
        onBack={() => navigation.goBack()}
      />
      <FlatList removeClippedSubviews={false}
        data={logs}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View style={{height: spacing.md}} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={<EmptyState title="No audit records" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
});
