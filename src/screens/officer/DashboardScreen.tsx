import React, {useCallback, useState} from 'react';
import {View, FlatList} from 'react-native';
import {CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {OfficerStackParamList, OfficerTabParamList} from '@/navigation/types';
import {Screen, StatCard, Header} from '@/components/ui';
import {ComplaintCard} from '@/components/complaints';
import {useTheme} from '@/theme';
import * as dashboardService from '@/services/dashboard.service';
import {useComplaintStore} from '@/store/complaintStore';
import {useAuthStore} from '@/store/authStore';
import type {DashboardStats} from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficerTabParamList, 'Dashboard'>,
  NativeStackScreenProps<OfficerStackParamList>
>;

export default function DashboardScreen({navigation}: Props) {
  const {spacing} = useTheme();
  const user = useAuthStore(s => s.user);
  const [stats, setStats] = useState<DashboardStats>({});
  const fetchAll = useComplaintStore(s => s.fetchAll);
  const complaints = useComplaintStore(s => s.complaints);
  const firstName = user?.name?.split(' ')[0] ?? 'Officer';

  useFocusEffect(
    useCallback(() => {
      dashboardService.getDashboard().then(setStats).catch(() => {});
      fetchAll({
        status: ['submitted', 'acknowledged', 'assigned', 'in_progress'],
      });
    }, [fetchAll]),
  );

  return (
    <Screen scroll edges={['top']}>
      <Header
        panel
        title={`Hey, ${firstName}`}
        subtitle="Review queue, assign workers, close the loop."
      />
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.lg,
        }}>
        <StatCard
          label="Pending"
          value={stats.pending ?? 0}
          icon="clock"
          index={0}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress ?? 0}
          icon="zap"
          emphasize
          index={1}
        />
        <StatCard
          label="Resolved"
          value={stats.resolved ?? 0}
          icon="check-circle"
          index={2}
        />
      </View>
      <FlatList removeClippedSubviews={false}
        data={complaints.slice(0, 10)}
        keyExtractor={item => item._id}
        scrollEnabled={false}
        contentContainerStyle={{paddingHorizontal: spacing.lg, paddingBottom: 28}}
        renderItem={({item, index}) => (
          <ComplaintCard
            complaint={item}
            index={index}
            onPress={() =>
              navigation.navigate('ComplaintDetail', {id: item._id})
            }
          />
        )}
      />
    </Screen>
  );
}
