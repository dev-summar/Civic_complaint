import React, {useCallback, useState} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen, Header, Card} from '@/components/ui';
import {ComplaintMap} from '@/components/maps';
import {colors, spacing, typography} from '@/theme';
import {useLocation} from '@/hooks/useLocation';
import * as userService from '@/services/user.service';
import {getAssignmentComplaint, getComplaintCoords} from '@/utils/assignment';
import type {Complaint} from '@/types';

export default function NavigateScreen() {
  const {location} = useLocation();
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useFocusEffect(
    useCallback(() => {
      userService
        .listAssignments()
        .then(items => {
          const list = items
            .filter(a => !['completed', 'cancelled', 'reassigned'].includes(a.status))
            .map(a => {
              const complaint = getAssignmentComplaint(a);
              if (!complaint) return null;
              const coords = getComplaintCoords(complaint);
              if (!coords) return null;
              return {
                ...complaint,
                location: {
                  ...coords,
                  address: complaint.address,
                },
              } as Complaint;
            })
            .filter(Boolean) as Complaint[];
          setComplaints(list);
        })
        .catch(() => setComplaints([]));
    }, []),
  );

  return (
    <Screen frame="fill">
      <Header
        panel
        title="Navigate"
        subtitle="Route to job locations"
      />
      <View style={styles.map}>
        <ComplaintMap
          complaints={complaints}
          center={location ?? undefined}
          height={400}
        />
      </View>
      <Card style={styles.info}>
        <Text style={styles.label}>{complaints.length} active destinations</Text>
        <Text style={styles.hint}>
          Open a job from the Jobs tab to start work and mark it complete.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: {padding: spacing.lg, flex: 1},
  info: {margin: spacing.lg},
  label: {...typography.label, color: colors.text},
  hint: {...typography.caption, color: colors.textSecondary, marginTop: 4},
});
