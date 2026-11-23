import React, {useCallback, useState} from 'react';
import {FlatList, Text, StyleSheet, Alert, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen, Header, Card, Button, EmptyState} from '@/components/ui';
import {ComplaintCard} from '@/components/complaints';
import {colors, spacing, typography} from '@/theme';
import * as userService from '@/services/user.service';
import {getErrorMessage} from '@/services/api';
import {useComplaintStore} from '@/store/complaintStore';
import type {User, Complaint} from '@/types';

const QUEUE_STATUSES = ['submitted', 'acknowledged'] as const;

export default function AssignScreen() {
  const [workers, setWorkers] = useState<User[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const complaints = useComplaintStore(s => s.complaints);
  const fetchAll = useComplaintStore(s => s.fetchAll);
  const assign = useComplaintStore(s => s.assign);
  const isLoading = useComplaintStore(s => s.isLoading);

  const load = useCallback(() => {
    fetchAll({status: [...QUEUE_STATUSES]});
    userService.listWorkers().then(setWorkers).catch(() => setWorkers([]));
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleAssign = async (worker: User) => {
    if (!selectedComplaint) return;
    try {
      await assign(selectedComplaint._id, worker._id);
      Alert.alert('Assigned', `${worker.name} assigned to “${selectedComplaint.title}”.`);
      setSelectedComplaint(null);
      load();
    } catch (err) {
      Alert.alert('Assignment failed', getErrorMessage(err));
    }
  };

  const assignable = complaints.filter(c =>
    QUEUE_STATUSES.includes(c.status as (typeof QUEUE_STATUSES)[number]),
  );

  return (
    <Screen>
      <Header
        panel
        title="Assign Workers"
        subtitle="Select a complaint, then a field worker"
      />
      <FlatList removeClippedSubviews={false}
        data={assignable}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={load}
        ListHeaderComponent={
          selectedComplaint ? (
            <Card style={styles.selected}>
              <Text style={styles.selectedTitle}>Selected: {selectedComplaint.title}</Text>
              <Text style={styles.hint}>Choose a worker below</Text>
              <View style={styles.workers}>
                {workers.map(worker => (
                  <Card key={worker._id} style={styles.worker}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{worker.name}</Text>
                      {worker.phone ? (
                        <Text style={styles.workerMeta}>{worker.phone}</Text>
                      ) : null}
                    </View>
                    <Button
                      title="Assign"
                      onPress={() => handleAssign(worker)}
                      loading={isLoading}
                    />
                  </Card>
                ))}
                {workers.length === 0 ? <EmptyState title="No workers available" /> : null}
              </View>
            </Card>
          ) : (
            <Text style={styles.hint}>Tap a complaint to select it</Text>
          )
        }
        renderItem={({item, index}) => (
          <View
            style={
              selectedComplaint?._id === item._id ? styles.itemActiveWrap : undefined
            }>
            <ComplaintCard
              complaint={item}
              index={index}
              onPress={() => setSelectedComplaint(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState title="Nothing to assign" message="Queue is clear for now." />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.lg, flexGrow: 1},
  hint: {...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md},
  selected: {marginBottom: spacing.lg, backgroundColor: `${colors.primary}10`},
  selectedTitle: {...typography.label, color: colors.primary},
  workers: {marginTop: spacing.md},
  worker: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  workerInfo: {flex: 1},
  workerName: {...typography.body, color: colors.text},
  workerMeta: {...typography.caption, color: colors.textSecondary, marginTop: 2},
  itemActiveWrap: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
});
