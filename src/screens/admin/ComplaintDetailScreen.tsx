import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList} from '@/navigation/types';
import {ManageComplaint} from '@/screens/shared/ManageComplaint';

type Props = NativeStackScreenProps<AdminStackParamList, 'ComplaintDetail'>;

export default function ComplaintDetailScreen({navigation, route}: Props) {
  return <ManageComplaint id={route.params.id} title="Complaints" onBack={() => navigation.goBack()} />;
}
