import React, {useEffect, useState} from 'react';
import {FlatList, Text, StyleSheet, View, ScrollView} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList} from '@/navigation/types';
import {Screen, Header, Card, EmptyState, Fab, BottomSheet, Input, Button} from '@/components/ui';
import {useTheme} from '@/theme';
import * as userService from '@/services/user.service';
import type {Zone} from '@/types';
import {useToastStore} from '@/store/toastStore';

type Props = NativeStackScreenProps<AdminStackParamList, 'Zones'>;

export default function ZonesScreen({navigation}: Props) {
  const {colors, spacing, typography} = useTheme();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSheet, setShowSheet] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [district, setDistrict] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchZones = () => {
    setLoading(true);
    userService.listZones().then(setZones).catch(e => {
      useToastStore.getState().show('Failed to fetch zones', 'error');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const openCreate = () => {
    setEditingZone(null);
    setName('');
    setCode('');
    setDistrict('');
    setShowSheet(true);
  };

  const openEdit = (zone: Zone) => {
    setEditingZone(zone);
    setName(zone.name);
    setCode(zone.code);
    setDistrict(zone.district || '');
    setShowSheet(true);
  };

  const handleSave = async () => {
    if (!name || !code) {
      useToastStore.getState().show('Please fill required fields', 'error');
      return;
    }
    try {
      setSubmitting(true);
      if (editingZone) {
        await userService.updateZone(editingZone._id, {name, code, district});
        useToastStore.getState().show('Zone updated', 'success');
      } else {
        await userService.createZone({name, code, district});
        useToastStore.getState().show('Zone created', 'success');
      }
      setShowSheet(false);
      fetchZones();
    } catch (e: any) {
      useToastStore.getState().show(e.message || 'Error saving zone', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    list: {padding: spacing.lg, flexGrow: 1, paddingBottom: 100},
    item: {marginBottom: spacing.md},
    name: {...typography.label, color: colors.text},
    code: {...typography.caption, color: colors.textSecondary, marginTop: 2},
    form: {padding: spacing.lg, paddingBottom: spacing.xxl},
    input: {marginBottom: spacing.md} });

  return (
    <Screen>
      <Header title="Zones" onBack={() => navigation.goBack()} />
      <FlatList removeClippedSubviews={false}
        data={zones}
        keyExtractor={item => item._id}
        refreshing={loading}
        onRefresh={fetchZones}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => openEdit(item)}>
            <Card style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>{item.code}{item.district ? ` • ${item.district}` : ''}</Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No zones configured" /> : null}
      />

      <Fab icon="plus" onPress={openCreate} />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingZone ? "Edit Zone" : "Add Zone"}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Name *" value={name} onChangeText={setName} containerStyle={styles.input} />
          <Input label="Code *" value={code} onChangeText={setCode} containerStyle={styles.input} />
          <Input label="District" value={district} onChangeText={setDistrict} containerStyle={styles.input} />
          <Button title="Save" onPress={handleSave} loading={submitting} />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
