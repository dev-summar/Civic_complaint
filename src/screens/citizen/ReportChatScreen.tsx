import React from 'react';
import {KeyboardAvoidingView, Platform} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '@/components/ui';
import {ReportChat} from '@/components/complaints/ReportChat';
import type {CitizenStackParamList} from '@/navigation/types';
import {useAppStore} from '@/store/appStore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<CitizenStackParamList, 'ReportChat'>;

export default function ReportChatScreen({navigation}: Props) {
  const language = useAppStore(s => s.language);
  const insets = useSafeAreaInsets();
  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ReportChat
          initialLanguage={language === 'hi' ? 'hi' : 'en'}
          bottomInset={insets.bottom}
          onBack={navigation.goBack}
          onTrack={id => navigation.navigate('ComplaintDetail', {id})}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
