import React, {useEffect, useState} from 'react';
import {FlatList, Text, StyleSheet, View, ScrollView, TextInput} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {Screen, Header, Card, Badge, EmptyState, Fab, BottomSheet, Input, Button} from '@/components/ui';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {useTheme} from '@/theme';
import * as userService from '@/services/user.service';
import {listComplaints} from '@/services/complaint.service';
import {ROLES, ROLE_LABELS} from '@/constants';
import {fonts} from '@/theme/typography';
import {formatDate} from '@/utils/format';
import type {Complaint, User} from '@/types';
import {useToastStore} from '@/store/toastStore';

function departmentName(user: User) {
  return typeof user.department === 'object' && user.department ? user.department.name : '';
}

export default function UsersScreen() {
  const {colors, spacing, typography} = useTheme();
  const desktop = useDesktopLayout();
  const [users, setUsers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  
  const [showSheet, setShowSheet] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>(ROLES.CITIZEN);
  const [submitting, setSubmitting] = useState(false);
  
  const fetchUsers = () => {
    setLoading(true);
    userService.listUsers().then(setUsers).catch(() => {
      useToastStore.getState().show('Failed to fetch users', 'error');
    }).finally(() => setLoading(false));
    listComplaints().then(setComplaints).catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole(ROLES.CITIZEN);
    setShowSheet(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || '');
    setPassword('');
    setRole(user.role);
    setShowSheet(true);
  };

  const handleSave = async () => {
    if (!name || !email || (!editingUser && !password)) {
      useToastStore.getState().show('Please fill required fields', 'error');
      return;
    }
    try {
      setSubmitting(true);
      if (editingUser) {
        await userService.updateUser(editingUser._id, {name, email, phone, role});
        useToastStore.getState().show('User updated', 'success');
      } else {
        await userService.createUser({name, email, phone, password, role});
        useToastStore.getState().show('User created', 'success');
      }
      setShowSheet(false);
      fetchUsers();
    } catch (e: any) {
      useToastStore.getState().show(e.message || 'Error saving user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async () => {
    if (!editingUser) return;
    try {
      setSubmitting(true);
      await userService.changeUserStatus(editingUser._id, editingUser.isActive === false ? true : false);
      useToastStore.getState().show('Status updated', 'success');
      setShowSheet(false);
      fetchUsers();
    } catch (e: any) {
      useToastStore.getState().show(e.message || 'Error updating status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    list: {padding: spacing.lg, flexGrow: 1, paddingBottom: 100},
    item: {marginBottom: spacing.md},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
    info: {flex: 1},
    name: {...typography.label, color: colors.text},
    email: {...typography.caption, color: colors.textSecondary},
    status: {marginTop: spacing.sm},
    form: {padding: spacing.lg, paddingBottom: spacing.xxl},
    input: {marginBottom: spacing.md},
    roleContainer: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg},
    roleButton: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1, borderColor: colors.border},
    roleButtonActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    roleText: {...typography.bodySmall, color: colors.text},
    roleTextActive: {color: '#fff'},
    roleLabel: {...typography.label, color: colors.text, marginBottom: spacing.sm},
    actions: {gap: spacing.md}
  });

  return (
    <Screen frame={desktop ? 'fill' : undefined} edges={desktop ? [] : undefined} style={desktop ? {backgroundColor: '#F7F8F7'} : undefined}>
      {desktop ? (
        <View style={{height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
          <Text style={{fontFamily: fonts.body, fontSize: 20, lineHeight: 28, fontWeight: '600', color: '#111827'}}>Users</Text>
          <View style={{flex: 1}} />
          <Button title="Invite user" size="sm" onPress={openCreate} />
        </View>
      ) : (
        <Header panel title="Users" subtitle="Manage platform accounts" />
      )}
      {desktop ? (
        <UserTable
          users={users.filter(item => {
            const needle = query.trim().toLowerCase();
            const roleOk = roleFilter === 'all' || item.role === roleFilter;
            const deptOk = deptFilter === 'all' || departmentName(item) === deptFilter;
            return roleOk && deptOk && (!needle || `${item.name} ${item.email} ${item.phone ?? ''}`.toLowerCase().includes(needle));
          })}
          departments={[...new Set(users.map(departmentName).filter(Boolean))]}
          complaints={complaints}
          loading={loading}
          query={query}
          roleFilter={roleFilter}
          deptFilter={deptFilter}
          onQuery={setQuery}
          onRole={setRoleFilter}
          onDept={setDeptFilter}
          onOpen={openEdit}
        />
      ) : null}
      {desktop ? null : <FlatList removeClippedSubviews={false}
        key={desktop ? 'users-grid' : 'users-list'}
        data={users}
        numColumns={desktop ? 2 : 1}
        columnWrapperStyle={desktop ? {gap: spacing.md} : undefined}
        keyExtractor={item => item._id}
        refreshing={loading}
        onRefresh={fetchUsers}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => openEdit(item)} style={desktop ? {flex: 1} : undefined}>
            <Card style={[styles.item, desktop ? {flex: 1} : undefined]}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                </View>
                <Badge label={ROLE_LABELS[item.role] || item.role} variant="info" />
              </View>
              <Badge label={item.isActive !== false ? 'Active' : 'Inactive'} variant={item.isActive !== false ? 'success' : 'error'} style={styles.status} />
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <EmptyState title="No users" /> : null}
      />}
      {desktop ? null : <Fab icon="plus" onPress={openCreate} />}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingUser ? "Edit User" : "Add User"}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Name *" value={name} onChangeText={setName} containerStyle={styles.input} />
          <Input label="Email *" value={email} onChangeText={setEmail} containerStyle={styles.input} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Phone" value={phone} onChangeText={setPhone} containerStyle={styles.input} keyboardType="phone-pad" />
          {!editingUser && (
            <Input label="Password *" value={password} onChangeText={setPassword} containerStyle={styles.input} secureTextEntry />
          )}
          
          <Text style={styles.roleLabel}>Role</Text>
          <View style={styles.roleContainer}>
            {Object.values(ROLES).map(r => (
              <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.roleButton, role === r && styles.roleButtonActive]}>
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{ROLE_LABELS[r] || r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <Button title="Save" onPress={handleSave} loading={submitting} />
            {editingUser && (
              <Button 
                title={editingUser.isActive !== false ? "Deactivate User" : "Activate User"} 
                variant={editingUser.isActive !== false ? 'danger' : 'secondary'}
                onPress={toggleStatus} 
                disabled={submitting} 
              />
            )}
          </View>
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

function UserTable({
  users, departments, complaints, loading, query, roleFilter, deptFilter, onQuery, onRole, onDept, onOpen,
}: {
  users: User[];
  departments: string[];
  complaints: Complaint[];
  loading: boolean;
  query: string;
  roleFilter: string;
  deptFilter: string;
  onQuery: (value: string) => void;
  onRole: (value: string) => void;
  onDept: (value: string) => void;
  onOpen: (user: User) => void;
}) {
  const openCount = (id: string) => complaints.filter(item => item.assigned_worker_id === id && !['resolved', 'closed', 'rejected'].includes(item.status)).length;
  const avgHours = (id: string) => {
    const done = complaints.filter(item => item.assigned_worker_id === id && ['resolved', 'closed'].includes(item.status));
    if (!done.length) return '—';
    const hours = done.reduce((sum, item) => sum + Math.max(0, Date.parse(item.updatedAt) - Date.parse(item.createdAt)), 0) / done.length / 3600000;
    return `${Math.round(hours)}h`;
  };
  const departmentOf = (user: User) => typeof user.department === 'object' && user.department ? user.department.name : '—';
  return (
    <View style={{flex: 1, padding: 24, backgroundColor: '#F7F8F7'}}>
      <View style={{flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap'}}>
        <TextInput value={query} onChangeText={onQuery} placeholder="Search name or email" placeholderTextColor="#6B7280" style={{flex: 1, minWidth: 220, maxWidth: 360, height: 36, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14, color: '#111827', backgroundColor: '#FFFFFF'}} />
        {['all', ...Object.values(ROLES)].map(role => (
          <TouchableOpacity key={role} onPress={() => onRole(role)} style={{paddingHorizontal: 8, height: 28, borderRadius: 8, borderWidth: 1, borderColor: roleFilter === role ? '#0F3D3A' : '#E5E7EB', backgroundColor: roleFilter === role ? '#E6F0EC' : '#FFFFFF', justifyContent: 'center'}}>
            <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>{role === 'all' ? 'All roles' : ROLE_LABELS[role] || role}</Text>
          </TouchableOpacity>
        ))}
        {departments.length ? ['all', ...departments].map(name => (
          <TouchableOpacity key={name} onPress={() => onDept(name)} style={{paddingHorizontal: 8, height: 28, borderRadius: 8, borderWidth: 1, borderColor: deptFilter === name ? '#0F3D3A' : '#E5E7EB', backgroundColor: deptFilter === name ? '#E6F0EC' : '#FFFFFF', justifyContent: 'center'}}>
            <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>{name === 'all' ? 'All departments' : name}</Text>
          </TouchableOpacity>
        )) : null}
      </View>
      <View style={{flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden'}}>
        <View style={{height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
          {['Name', 'Role', 'Department', 'Open', 'Avg resolve', 'Updated', 'Status'].map(label => (
            <Text key={label} style={{flex: label === 'Name' ? 1.6 : 1, fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase'}}>{label}</Text>
          ))}
        </View>
        {loading ? <View style={{height: 180, margin: 12, borderRadius: 8, backgroundColor: '#E7EEEC'}} /> : (
          <FlatList
            data={users}
            keyExtractor={item => item._id}
            ListEmptyComponent={<EmptyState title="No users" />}
            renderItem={({item}) => (
              <TouchableOpacity onPress={() => onOpen(item)} style={{height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
                <View style={{flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={{width: 20, height: 20, borderRadius: 10, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: '#0F3D3A'}}>{item.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text numberOfLines={1} style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}}>{item.name}</Text>
                    <Text numberOfLines={1} style={{fontSize: 12, lineHeight: 16, color: '#6B7280'}}>{item.email}</Text>
                  </View>
                </View>
                <Text style={{flex: 1, fontSize: 13, lineHeight: 18, color: '#4B5563'}}>{ROLE_LABELS[item.role] || item.role}</Text>
                <Text style={{flex: 1, fontSize: 13, lineHeight: 18, color: '#4B5563'}}>{departmentOf(item)}</Text>
                <Text style={{flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#111827'}}>{openCount(item._id) ? `${openCount(item._id)} open` : '—'}</Text>
                <Text style={{flex: 1, fontSize: 13, lineHeight: 18, color: '#111827', fontVariant: ['tabular-nums']}}>{avgHours(item._id)}</Text>
                <Text style={{flex: 1, fontSize: 12, lineHeight: 16, color: '#6B7280'}}>{formatDate(item.updatedAt)}</Text>
                <Text style={{flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600', color: item.isActive !== false ? '#15803D' : '#B91C1C'}}>{item.isActive !== false ? 'Active' : 'Inactive'}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}
