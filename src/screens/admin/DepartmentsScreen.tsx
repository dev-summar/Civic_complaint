import React, {useEffect, useState} from 'react';
import {FlatList, Text, StyleSheet, View, ScrollView} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {Screen, Header, Card, EmptyState, Fab, BottomSheet, Input, Button} from '@/components/ui';
import {useTheme} from '@/theme';
import * as userService from '@/services/user.service';
import type {Department} from '@/types';
import {useToastStore} from '@/store/toastStore';

export default function DepartmentsScreen({navigation}: {navigation?: {goBack: () => void}}) {
  const {colors, spacing, typography} = useTheme();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [showSheet, setShowSheet] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = () => {
    setLoading(true);
    userService.listDepartments().then(setDepartments).catch(e => {
      useToastStore.getState().show('Failed to fetch departments', 'error');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openCreate = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setDescription('');
    setShowSheet(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
    setShowSheet(true);
  };

  const handleSave = async () => {
    if (!name || !code) {
      useToastStore.getState().show('Please fill required fields', 'error');
      return;
    }
    try {
      setSubmitting(true);
      if (editingDept) {
        await userService.updateDepartment(editingDept._id, {name, code, description});
        useToastStore.getState().show('Department updated', 'success');
      } else {
        await userService.createDepartment({name, code, description});
        useToastStore.getState().show('Department created', 'success');
      }
      setShowSheet(false);
      fetchDepartments();
    } catch (e: any) {
      useToastStore.getState().show(e.message || 'Error saving department', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    list: {padding: spacing.lg, flexGrow: 1, paddingBottom: 100},
    item: {marginBottom: spacing.md},
    name: {...typography.label, color: colors.text},
    code: {...typography.caption, color: colors.primary, marginTop: 2},
    desc: {...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm},
    form: {padding: spacing.lg, paddingBottom: spacing.xxl},
    input: {marginBottom: spacing.md} });

  return (
    <Screen>
      <Header title="Departments" onBack={navigation ? () => navigation.goBack() : undefined} />
      <FlatList removeClippedSubviews={false}
        data={departments}
        keyExtractor={item => item._id}
        refreshing={loading}
        onRefresh={fetchDepartments}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => openEdit(item)}>
            <Card style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>{item.code}</Text>
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No departments" /> : null}
      />

      <Fab icon="plus" onPress={openCreate} />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingDept ? "Edit Department" : "Add Department"}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Name *" value={name} onChangeText={setName} containerStyle={styles.input} />
          <Input label="Code *" value={code} onChangeText={setCode} containerStyle={styles.input} />
          <Input label="Description" value={description} onChangeText={setDescription} containerStyle={styles.input} />
          <Button title="Save" onPress={handleSave} loading={submitting} />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
