import React, {useEffect, useState} from 'react';
import {ScrollView, Text, StyleSheet, Alert, Linking} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {WorkerStackParamList} from '@/navigation/types';
import {Screen, Header, Badge, Button, Input, LoadingOverlay} from '@/components/ui';
import {Timeline, ComplaintPhotos} from '@/components/complaints';
import {ComplaintOwnership} from '@/components/complaints/ComplaintOwnership';
import {MiniMap} from '@/components/maps';
import {colors, spacing, typography} from '@/theme';
import {formatStatus} from '@/utils/format';
import {getComplaintCoords, getComplaintId} from '@/utils/assignment';
import {getErrorMessage} from '@/services/api';
import {useComplaintStore} from '@/store/complaintStore';
import * as userService from '@/services/user.service';

type Props = NativeStackScreenProps<WorkerStackParamList, 'JobDetail'>;

export default function JobDetailScreen({navigation, route}: Props) {
  const {id} = route.params;
  const selected = useComplaintStore(s => s.selected);
  const timeline = useComplaintStore(s => s.timeline);
  const isLoading = useComplaintStore(s => s.isLoading);
  const fetchOne = useComplaintStore(s => s.fetchOne);
  const fetchTimeline = useComplaintStore(s => s.fetchTimeline);
  const resolve = useComplaintStore(s => s.resolve);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchOne(id);
    fetchTimeline(id);
  }, [id, fetchOne, fetchTimeline]);

  const c = selected?._id === id ? selected : null;
  const coords = c ? getComplaintCoords(c) : null;
  const canResolve = c && ['assigned', 'in_progress'].includes(c.status);

  const startRelatedAssignment = async () => {
    setStarting(true);
    try {
      const assignments = await userService.listAssignments();
      const match = assignments.find(
        a => getComplaintId(a) === id && a.status === 'pending',
      );
      if (!match) {
        Alert.alert('Job not found', 'This job is no longer assigned to you. Pull down on My Jobs to refresh.');
        return;
      }
      await userService.updateAssignmentStatus(match._id, 'active');
      await fetchOne(id);
      await fetchTimeline(id);
      Alert.alert('Started', 'Job marked in progress. The citizen has been notified.');
    } catch (err) {
      Alert.alert('Could not start', getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const completeJob = async () => {
    const trimmed = notes.trim();
    if (trimmed.length < 5) {
      Alert.alert('Notes required', 'Add at least 5 characters describing the resolution.');
      return;
    }
    setSubmitting(true);
    try {
      await resolve(id, trimmed);
      Alert.alert('Done', 'Job marked as resolved.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Resolve failed', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Header title="Job Detail" onBack={() => navigation.goBack()} />
      <LoadingOverlay visible={isLoading && !c} />
      {c ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{c.title}</Text>
          <Badge label={formatStatus(c.status)} color={colors.status[c.status]} />
          <Text style={styles.desc}>{c.description}</Text>
            <ComplaintOwnership complaint={c} />
            <ComplaintPhotos media={c.media} />
          {coords ? <MiniMap location={coords} /> : null}
          {coords ? (
            <Button
              title="Get Directions"
              variant="outline"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`,
                )
              }
              style={styles.action}
            />
          ) : null}
          {c.location?.address ? <Text style={styles.desc}>{c.location.address}</Text> : null}
          <Timeline events={timeline} />

          {c.status === 'assigned' ? (
            <Button
              title="Start Job"
              onPress={startRelatedAssignment}
              loading={starting}
              style={styles.action}
            />
          ) : null}

          {canResolve ? (
            <>
              <Input
                label="Completion Notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="What did you fix? (min 5 characters)"
              />
              <Button
                title="Complete Job"
                onPress={completeJob}
                loading={submitting}
                style={styles.action}
              />
            </>
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {padding: spacing.lg, paddingBottom: spacing.xxxl},
  title: {...typography.h2, color: colors.text},
  desc: {...typography.body, color: colors.textSecondary, marginVertical: spacing.md},
  action: {marginTop: spacing.lg},
});
