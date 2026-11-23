import React from 'react';
import {CompositeScreenProps} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList, AdminTabParamList} from '@/navigation/types';
import {ComplaintBoard} from '@/components/complaints';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {AdminWorkspace} from './AdminWorkspace';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'Complaints'>,
  NativeStackScreenProps<AdminStackParamList>
>;

export default function ComplaintsScreen({navigation}: Props) {
  const desktop = useDesktopLayout();
  if (desktop) {
    return <AdminWorkspace onOpen={id => navigation.navigate('ComplaintDetail', {id})} />;
  }
  return (
    <ComplaintBoard
      title="All Complaints"
      subtitle="Assign, reassign, or resolve any complaint"
      onOpen={id => navigation.navigate('ComplaintDetail', {id})}
    />
  );
}
