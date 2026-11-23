import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WorkerStackParamList, WorkerTabParamList} from '@/navigation/types';
import {Screen, Header, Card, EmptyState, Button} from '@/components/ui';
import {ComplaintCard} from '@/components/complaints';
import {spacing, typography, colors} from '@/theme';
import * as userService from '@/services/user.service';
import {getAssignmentComplaint, getComplaintId} from '@/utils/assignment';
import type {Assignment} from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<WorkerTabParamList, 'Jobs'>,
  NativeStackScreenProps<WorkerStackParamList>
>;

export default function JobsScreen({navigation}: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    userService
      .listAssignments()
      .then(items =>
        setAssignments(
          items.filter(a => !['completed', 'cancelled', 'reassigned'].includes(a.status)),
        ),
      )
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openJob = (item: Assignment) => {
    const id = getComplaintId(item);
    if (id) {
      navigation.navigate('JobDetail', {id});
    }
  };

  return (
    <Screen edges={['top']}>
      <Header
        panel
        title="My Jobs"
        subtitle="Assigned field work across your zone"
        rightAction={<Button title="Alerts" size="sm" variant="outline" onPress={() => navigation.navigate('Notifications')} />}
      />
      <FlatList removeClippedSubviews={false}
        data={assignments}
        keyExtractor={item => item._id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        renderItem={({item, index}) => {
          const complaint = getAssignmentComplaint(item);
          if (complaint) {
            return (
              <ComplaintCard
                complaint={complaint}
                index={index}
                onPress={() => openJob(item)}
              />
            );
          }
          return (
            <TouchableOpacity onPress={() => openJob(item)}>
              <Card style={styles.fallback}>
                <Text style={styles.fallbackText}>
                  Assignment #{item._id.slice(-6)} · {item.status}
                </Text>
                <Text style={styles.fallbackHint}>Tap to open job</Text>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="briefcase" title="No jobs assigned" />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.lg, flexGrow: 1},
  fallback: {marginBottom: spacing.md},
  fallbackText: {...typography.body, color: colors.text},
  fallbackHint: {...typography.caption, color: colors.textSecondary, marginTop: 4},
});
