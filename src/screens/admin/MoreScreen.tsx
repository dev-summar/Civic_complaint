import React from 'react';
import {View, StyleSheet } from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {CompositeScreenProps} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList, AdminTabParamList} from '@/navigation/types';
import {Screen, Header, Card, Button, AppIcon, Text, IconName} from '@/components/ui';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {useTheme} from '@/theme';
import {useAuthStore} from '@/store/authStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'More'>,
  NativeStackScreenProps<AdminStackParamList>
>;

const links: {icon: IconName; label: string; route: 'Departments' | 'Zones' | 'Categories' | 'Audit' | 'Notifications'}[] = [
  {icon: 'building', label: 'Departments', route: 'Departments'},
  {icon: 'map', label: 'Zones', route: 'Zones'},
  {icon: 'grid', label: 'Categories', route: 'Categories'},
  {icon: 'shield', label: 'Audit Log', route: 'Audit'},
  {icon: 'bell', label: 'Notifications', route: 'Notifications'},
];

export default function MoreScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const desktop = useDesktopLayout();
  const logout = useAuthStore(s => s.logout);

  return (
    <Screen scroll>
      <Header panel title="More" subtitle="Zones, categories, and audit tools" />
      {desktop ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.lg}}>
          {links.map(link => (
            <Card key={link.route} style={{width: '31.5%', minWidth: 220}}>
              <TouchableOpacity
                style={[styles.item, {gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 0}]}
                onPress={() => navigation.navigate(link.route)}>
                <AppIcon name={link.icon} size={22} color={colors.primary} />
                <Text variant="body" style={styles.label}>{link.label}</Text>
                <AppIcon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={{margin: spacing.lg}}>
          {links.map(link => (
            <TouchableOpacity
              key={link.route}
              style={[styles.item, {gap: spacing.md, paddingVertical: spacing.md, borderBottomColor: colors.border}]}
              onPress={() => navigation.navigate(link.route)}>
              <AppIcon name={link.icon} size={22} color={colors.primary} />
              <Text variant="body" style={styles.label}>{link.label}</Text>
              <AppIcon name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>
      )}
      <Button
        title="Logout"
        variant="danger"
        onPress={logout}
        style={{marginHorizontal: spacing.xl}}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1 },
  label: {flex: 1} });
