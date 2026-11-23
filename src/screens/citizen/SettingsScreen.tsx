import React from 'react';
import {View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CitizenStackParamList} from '@/navigation/types';
import {
  Screen,
  Header,
  Card,
  SwitchRow,
  SegmentedControl,
  Text,
} from '@/components/ui';
import {useTheme} from '@/theme';
import {useAppStore} from '@/store/appStore';
import {supportedLocales, t} from '@/utils/i18n';
import {useToastStore} from '@/store/toastStore';

type Props = NativeStackScreenProps<CitizenStackParamList, 'Settings'>;

export default function SettingsScreen({navigation}: Props) {
  const {spacing} = useTheme();
  const theme = useAppStore(s => s.theme);
  const language = useAppStore(s => s.language);
  const setTheme = useAppStore(s => s.setTheme);
  const setLanguage = useAppStore(s => s.setLanguage);
  const pushEnabled = useAppStore(s => s.pushEnabled);
  const locationEnabled = useAppStore(s => s.locationEnabled);
  const setPushEnabled = useAppStore(s => s.setPushEnabled);
  const setLocationEnabled = useAppStore(s => s.setLocationEnabled);

  return (
    <Screen scroll>
      <Header title={t('settings')} onBack={() => navigation.goBack()} />

      <View style={{padding: spacing.lg, gap: spacing.lg}}>
        <Card>
          <Text variant="label" muted style={{marginBottom: spacing.sm}}>
            Preferences
          </Text>
          <SwitchRow
            label="Push Notifications"
            description="Receive status updates"
            value={pushEnabled}
            onValueChange={(val) => {
              setPushEnabled(val);
              useToastStore.getState().show(
                val ? 'Push notifications enabled' : 'Push notifications disabled',
                'success'
              );
            }}
          />
          <SwitchRow
            label="Location Services"
            description="Auto-fill GPS on reports"
            value={locationEnabled}
            onValueChange={(val) => {
              setLocationEnabled(val);
              useToastStore.getState().show(
                val ? 'Location services enabled' : 'Location services disabled',
                'success'
              );
            }}
          />
        </Card>

        <Card>
          <Text variant="label" muted style={{marginBottom: spacing.md}}>
            Appearance
          </Text>
          <SegmentedControl
            options={[
              {label: 'Light', value: 'light'},
              {label: 'Dark', value: 'dark'},
              {label: 'System', value: 'system'},
            ]}
            value={theme}
            onChange={v => setTheme(v as 'light' | 'dark' | 'system')}
          />
        </Card>

        <Card>
          <Text variant="label" muted style={{marginBottom: spacing.md}}>
            Language
          </Text>
          <SegmentedControl
            options={supportedLocales.map(l => ({
              label: l.label,
              value: l.code,
            }))}
            value={language}
            onChange={setLanguage}
          />
        </Card>
      </View>
    </Screen>
  );
}
