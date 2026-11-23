import React, {useEffect, useState} from 'react';
import {FlatList, Text, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CitizenStackParamList} from '@/navigation/types';
import {Screen, Header, EmptyState, Card} from '@/components/ui';
import {colors, spacing, typography} from '@/theme';
import {formatRelativeTime} from '@/utils/format';
import * as notificationService from '@/services/notification.service';
import type {Notification} from '@/types';

type Props = NativeStackScreenProps<CitizenStackParamList, 'Notifications'>;

export default function NotificationsScreen({navigation}: Props) {
  return <NotificationInbox onBack={() => navigation.goBack()}
    onComplaint={id => navigation.navigate('ComplaintDetail', {id})} />;
}

export function NotificationInbox({onBack, onComplaint}: {onBack: () => void; onComplaint: (id: string) => void}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationService.listNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await notificationService.markRead(id).catch(() => undefined);
    setItems(prev => prev.map(n => (n._id === id ? {...n, isRead: true} : n)));
  };

  return (
    <Screen>
      <Header title="Notifications" onBack={onBack} />
      <FlatList removeClippedSubviews={false}
        data={items}
        keyExtractor={item => item._id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => {
            markRead(item._id);
            if (typeof item.data?.complaintId === 'string') onComplaint(item.data.complaintId);
          }}>
            <Card style={{...styles.item, ...(!item.isRead ? styles.unread : {})}}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="bell" title="No notifications" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.lg, flexGrow: 1},
  item: {marginBottom: spacing.md},
  unread: {borderLeftWidth: 3, borderLeftColor: colors.primary},
  title: {...typography.label, color: colors.text},
  body: {...typography.bodySmall, color: colors.textSecondary, marginTop: 4},
  time: {...typography.caption, color: colors.textMuted, marginTop: spacing.sm} });
