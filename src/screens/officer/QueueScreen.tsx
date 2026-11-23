import React from 'react';
import {CompositeScreenProps} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {OfficerStackParamList, OfficerTabParamList} from '@/navigation/types';
import {ComplaintBoard} from '@/components/complaints';

type Props = CompositeScreenProps<
  BottomTabScreenProps<OfficerTabParamList, 'Queue'>,
  NativeStackScreenProps<OfficerStackParamList>
>;

export default function QueueScreen({navigation}: Props) {
  return (
    <ComplaintBoard
      title="Complaints"
      subtitle="Every stage, from new reports to closed jobs"
      onOpen={id => navigation.navigate('ComplaintDetail', {id})}
      onNotifications={() => navigation.navigate('Notifications')}
    />
  );
}
