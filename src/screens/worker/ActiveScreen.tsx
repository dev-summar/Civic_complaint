import React, {useCallback, useState} from 'react';
import {FlatList, StyleSheet, Text, Alert} from 'react-native';
import {CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WorkerStackParamList, WorkerTabParamList} from '@/navigation/types';
import {Screen, Header, Card, Button, EmptyState} from '@/components/ui';
import {colors, spacing, typography} from '@/theme';
import * as userService from '@/services/user.service';
import {getAssignmentComplaint, getComplaintId} from '@/utils/assignment';
import {getErrorMessage} from '@/services/api';
import type {Assignment} from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<WorkerTabParamList, 'Active'>,
  NativeStackScreenProps<WorkerStackParamList>
>;

export default function ActiveScreen({navigation}: Props) {
  const [active, setActive] = useState<Assignment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    userService
      .listAssignments()
      .then(items => {
        setActive(items.filter(a => a.status === 'active' || a.status === 'pending'));
      })
      .catch(() => setActive([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const startJob = async (item: Assignment) => {
    setBusyId(item._id);
    try {
      await userService.updateAssignmentStatus(item._id, 'active');
      load();
    } catch (err) {
      Alert.alert('Could not start', getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const openResolve = (item: Assignment) => {
    const id = getComplaintId(item);
    if (id) {
      navigation.navigate('JobDetail', {id});
    }
  };

  return (
    <Screen>
      <Header
        panel
        title="Active Job"
        subtitle="Start work, then resolve with notes"
      />
      <FlatList removeClippedSubviews={false}
        data={active}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={false}
        renderItem={({item}) => {
          const complaint = getAssignmentComplaint(item);
          const title = complaint?.title ?? `Job ${item._id.slice(-6)}`;
          const address = complaint?.address;
          return (
            <Card style={styles.item}>
              <Text style={styles.title}>{title}</Text>
              {address ? <Text style={styles.meta}>{address}</Text> : null}
              <Text style={styles.status}>Status: {item.status}</Text>
              {item.status === 'pending' ? (
                <Button
                  title="Start Job"
                  onPress={() => startJob(item)}
                  loading={busyId === item._id}
                  style={styles.btn}
                />
              ) : (
                <Button
                  title="Complete / Resolve"
                  onPress={() => openResolve(item)}
                  style={styles.btn}
                />
              )}
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState icon="zap" title="No active jobs" />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {padding: spacing.lg, flexGrow: 1},
  item: {marginBottom: spacing.md},
  title: {...typography.label, color: colors.text},
  meta: {...typography.caption, color: colors.textSecondary, marginTop: 4},
  status: {...typography.caption, color: colors.textSecondary, marginTop: 4},
  btn: {marginTop: spacing.md},
});
