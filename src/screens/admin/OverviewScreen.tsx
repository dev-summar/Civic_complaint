import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, Pressable, TextInput, View} from 'react-native';
import {CompositeScreenProps, useFocusEffect} from '@react-navigation/native';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList, AdminTabParamList} from '@/navigation/types';
import {AppIcon, Screen, Text} from '@/components/ui';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {fonts} from '@/theme/typography';
import {useAuthStore} from '@/store/authStore';
import {useAppStore} from '@/store/appStore';
import {useComplaintStore} from '@/store/complaintStore';
import * as dashboardService from '@/services/dashboard.service';
import {listComplaints} from '@/services/complaint.service';
import * as userService from '@/services/user.service';
import {formatHours, getCleanCityScore} from '@/services/engagement.service';
import {CATEGORY_META} from '@/constants';
import {scriptTextStyle} from '@/utils/scriptText';
import type {CleanCityScore, Complaint, DashboardStats, User} from '@/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'Overview'>,
  NativeStackScreenProps<AdminStackParamList>
>;

const numberStyle = {fontFamily: fonts.body, fontVariant: ['tabular-nums' as const], fontWeight: '600' as const, color: '#111827'};

function weekCount(items: Complaint[], weeksAgo: number, match: (item: Complaint) => boolean) {
  const now = Date.now();
  const end = now - weeksAgo * 7 * 86400000;
  const start = end - 7 * 86400000;
  return items.filter(item => {
    const time = Date.parse(item.updatedAt || item.createdAt);
    return time >= start && time < end && match(item);
  }).length;
}

function placeOf(item: Complaint) {
  if (item.location?.address) return item.location.address;
  if (item.address) return item.address;
  if (item.zone && typeof item.zone === 'object') return item.zone.name;
  return 'Location not set';
}

function ageOf(item: Complaint) {
  const due = Date.parse(item.resolutionDueAt || item.assignmentDueAt || '');
  const open = !['resolved', 'closed', 'rejected'].includes(item.status);
  if (open && Number.isFinite(due) && due < Date.now()) {
    const days = Math.max(1, Math.ceil((Date.now() - due) / 86400000));
    return {label: `${days}d overdue`, color: '#B91C1C'};
  }
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(item.createdAt)) / 3600000));
  return {label: hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`, color: '#3E4C49'};
}

export default function OverviewScreen({navigation}: Props) {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const unread = useAppStore(state => state.unreadNotifications);
  const assign = useComplaintStore(state => state.assign);
  const [stats, setStats] = useState<DashboardStats>({});
  const [score, setScore] = useState<CleanCityScore | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  const load = useCallback(() => {
    Promise.all([
      dashboardService.getDashboard().then(setStats).catch(() => {}),
      getCleanCityScore().then(setScore).catch(() => {}),
      listComplaints().then(setComplaints).catch(() => {}),
      userService.listWorkers().then(setWorkers).catch(() => {}),
    ]).finally(() => setReady(true));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onKey = (event: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const open = useMemo(() => complaints.filter(item => !['resolved', 'closed', 'rejected'].includes(item.status)), [complaints]);
  const attention = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return open
      .filter(item => !needle || `${item.title} ${item.description} ${placeOf(item)}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const due = (item: Complaint) => {
          const time = Date.parse(item.resolutionDueAt || item.assignmentDueAt || '');
          return Number.isFinite(time) && time < Date.now() ? time : Number.POSITIVE_INFINITY;
        };
        return due(a) - due(b) || Date.parse(a.createdAt) - Date.parse(b.createdAt);
      });
  }, [open, query]);
  const queue = attention.slice(0, 10);

  const total = stats.totalComplaints ?? complaints.length;
  const resolved = (stats.resolved ?? 0) + (stats.closed ?? 0);
  const rate = total ? Math.round((resolved / total) * 100) : 0;
  const resolvedNow = weekCount(complaints, 0, item => ['resolved', 'closed'].includes(item.status));
  const resolvedPrev = weekCount(complaints, 1, item => ['resolved', 'closed'].includes(item.status));
  const rateDelta = resolvedNow - resolvedPrev;
  const tone = (score?.score ?? 0) >= 75 ? '#1F7A4D' : (score?.score ?? 0) >= 45 ? '#B58105' : '#B42318';
  const categoryRows = Object.entries(complaints.reduce<Record<string, number>>((counts, item) => {
    const label = CATEGORY_META[item.category]?.label ?? 'Others';
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const zoneRows = Object.entries(complaints.reduce<Record<string, number>>((counts, item) => {
    const label = typeof item.zone === 'object' && item.zone ? item.zone.name : item.departmentName || 'Unzoned';
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const card = {flex: 1, minWidth: 0, height: 104, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, overflow: 'hidden' as const};

  return (
    <Screen frame="fill" edges={[]} style={{backgroundColor: '#F7F8F7'}}>
      <View style={{height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
        <Text style={{fontFamily: fonts.body, fontSize: 20, lineHeight: 28, fontWeight: '600', color: '#111827'}}>Overview</Text>
        <View style={{flex: 1}} />
        <View style={{width: 360, maxWidth: '40%', height: 36, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12}}>
          <AppIcon name="search" size={16} color="#6B7280" />
          <TextInput ref={searchRef} value={query} onChangeText={setQuery} placeholder="Search complaints  (/)" placeholderTextColor="#6B7280" style={{flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: '#111827', paddingVertical: 0}} />
        </View>
        <TouchableOpacity accessibilityLabel="Notifications" onPress={() => navigation.navigate('Notifications')} style={{width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center'}}>
          <AppIcon name="bell" size={18} color="#111827" />
          {unread > 0 ? <View style={{position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#B91C1C', borderWidth: 1, borderColor: '#FFFFFF'}} /> : null}
        </TouchableOpacity>
        <View>
          <TouchableOpacity accessibilityLabel="Account" onPress={() => setMenu(value => !value)} style={{flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 4, borderRadius: 8}}>
            <View style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{fontSize: 12, fontWeight: '600', color: '#0F3D3A'}}>{(user?.name ?? 'A').slice(0, 1)}</Text>
            </View>
            <Text numberOfLines={1} style={{maxWidth: 120, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}}>{user?.name ?? 'Admin'}</Text>
            <AppIcon name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
          {menu ? (
            <TouchableOpacity onPress={logout} style={{position: 'absolute', top: 40, right: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, zIndex: 5}}>
              <Text style={{fontSize: 14, lineHeight: 20, color: '#B91C1C', fontWeight: '600'}}>Log out</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={{flex: 1, width: '100%', maxWidth: 1600, alignSelf: 'flex-start', padding: 24, gap: 16, backgroundColor: '#F7F8F7'}}>
        {!ready ? (
          <View style={{height: 104, borderRadius: 10, backgroundColor: '#E5E7EB'}} />
        ) : (
          <View style={{flexDirection: 'row', gap: 16}}>
            <View style={[card, {backgroundColor: '#FEF2F2', borderColor: '#FECACA'}]}>
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#B91C1C'}}>Overdue &gt;72h</Text>
              <Text style={{...numberStyle, fontSize: 28, lineHeight: 32, color: '#B91C1C'}}>{stats.overdue ?? 0}</Text>
              <Text style={{fontSize: 12, lineHeight: 16, color: '#6B7280'}}>of {total}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Complaints')} style={{position: 'absolute', top: 12, right: 12}}>
                <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>View all</Text>
              </TouchableOpacity>
            </View>
            <View style={card}>
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#6B7280'}}>Pending</Text>
              <Text style={{...numberStyle, fontSize: 28, lineHeight: 32}}>{stats.pending ?? 0}</Text>
              <Text style={{fontSize: 12, lineHeight: 16, color: '#6B7280'}}>waiting</Text>
            </View>
            <View style={card}>
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#6B7280'}}>Resolution rate</Text>
              <Text style={{...numberStyle, fontSize: 28, lineHeight: 32}}>{rate}%</Text>
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: rateDelta === 0 ? '#6B7280' : rateDelta > 0 ? '#15803D' : '#B91C1C'}}>
                {rateDelta === 0 ? 'No change' : `${rateDelta > 0 ? '↑' : '↓'} ${Math.abs(rateDelta)} this week`}
              </Text>
            </View>
            <View style={card}>
              <View style={{flex: 1, flexDirection: 'row', gap: 12}}>
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#6B7280'}}>Avg to assign</Text>
                  <Text style={{...numberStyle, fontSize: 20, lineHeight: 28}}>{formatHours(stats.avgAssignHours)}</Text>
                </View>
                <View style={{width: 1, backgroundColor: '#E5E7EB'}} />
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#6B7280'}}>Avg to resolve</Text>
                  <Text style={{...numberStyle, fontSize: 20, lineHeight: 28}}>{formatHours(stats.avgResolutionHours)}</Text>
                </View>
              </View>
            </View>
            <View style={card}>
              <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12}}>
                <View style={{width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: tone, alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{fontSize: 14, lineHeight: 18, fontWeight: '600', color: tone, fontVariant: ['tabular-nums']}}>{score?.score ?? '—'}</Text>
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <Text numberOfLines={1} style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#111827'}}>Clean City Score</Text>
                  <View style={{height: 6, flexDirection: 'row', borderRadius: 3, overflow: 'hidden', marginTop: 6}}>
                    <View style={{flex: 45, backgroundColor: '#FECACA'}} />
                    <View style={{flex: 30, backgroundColor: '#FDE68A'}} />
                    <View style={{flex: 25, backgroundColor: '#BBF7D0'}} />
                  </View>
                  <View style={{flexDirection: 'row', marginTop: 2}}>
                    <Text style={{flex: 45, fontSize: 12, lineHeight: 16, color: '#6B7280'}}>0</Text>
                    <Text style={{flex: 30, fontSize: 12, lineHeight: 16, color: '#6B7280'}}>45</Text>
                    <Text style={{flex: 25, fontSize: 12, lineHeight: 16, color: '#6B7280'}}>75</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={{flexDirection: 'row', gap: 16, alignItems: 'flex-start'}}>
          <View style={{flex: 2, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden'}}>
            <View style={{height: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16}}>
              <Text style={{flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}}>Needs you now</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Complaints')} style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>View all</Text>
                <View style={{minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
                  <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A', fontVariant: ['tabular-nums']}}>{attention.length}</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={{height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF'}}>
              {[['Complaint', undefined], ['Category', 96], ['Age', 96], ['Assignee', 148], ['', 92]].map(([label, width]) => (
                <Text key={label || 'action'} style={{flex: width ? undefined : 1, width, fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase'}}>{label}</Text>
              ))}
            </View>
            {queue.length ? queue.map(item => {
              const meta = CATEGORY_META[item.category] ?? CATEGORY_META.others;
              const age = ageOf(item);
              const assigned = Boolean(item.workerName || item.assigned_worker_id);
              return (
                <QueueRow key={item._id}>
                  <View style={{flex: 1, minWidth: 0, paddingRight: 8}}>
                    <Text numberOfLines={1} style={[{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}, scriptTextStyle(item.title)]}>{item.title}</Text>
                    <Text numberOfLines={1} style={{fontSize: 12, lineHeight: 16, color: '#6B7280'}}>{placeOf(item)}</Text>
                  </View>
                  <View style={{width: 96}}>
                    <Text numberOfLines={1} style={{alignSelf: 'flex-start', maxWidth: 88, fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#4B5563', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2}}>{meta.label}</Text>
                  </View>
                  <View style={{width: 96}}>
                    <Text numberOfLines={1} style={{alignSelf: 'flex-start', fontSize: 12, lineHeight: 16, fontWeight: '600', color: age.color, backgroundColor: age.color === '#B42318' ? '#FEF2F2' : '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2}}>{age.label}</Text>
                  </View>
                  <View style={{width: 148, flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <View style={{width: 20, height: 20, borderRadius: 10, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
                      <Text style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: '#0F3D3A'}}>{(item.workerName || '?').slice(0, 1)}</Text>
                    </View>
                    <Text numberOfLines={1} style={{flex: 1, fontSize: 13, lineHeight: 18, color: '#4B5563'}}>{item.workerName || 'Unassigned'}</Text>
                  </View>
                  <View style={{width: 92, alignItems: 'flex-end'}}>
                    <TouchableOpacity onPress={() => setAssigning(assigning === item._id ? null : item._id)} style={{height: 28, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: assigned ? '#FFFFFF' : '#0F3D3A', borderWidth: assigned ? 1 : 0, borderColor: '#E5E7EB'}}>
                      <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: assigned ? '#111827' : '#FFFFFF'}}>{assigned ? 'Reassign' : 'Assign'}</Text>
                    </TouchableOpacity>
                  </View>
                </QueueRow>
              );
            }) : <Text style={{fontSize: 14, lineHeight: 20, color: '#4B5563', padding: 16}}>Nothing open matches this search.</Text>}
            {assigning ? (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
                {workers.slice(0, 8).map(worker => (
                  <TouchableOpacity key={worker._id} onPress={() => { void assign(assigning, worker._id).then(load); setAssigning(null); }} style={{paddingHorizontal: 8, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center'}}>
                    <Text style={{fontSize: 13, lineHeight: 18, color: '#111827'}}>{worker.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
          <View style={{flex: 1, minWidth: 0, gap: 16}}>
            <ChartCard title="By category" rows={categoryRows} total={Math.max(1, complaints.length)} onPress={label => {
              const key = Object.keys(CATEGORY_META).find(item => CATEGORY_META[item as keyof typeof CATEGORY_META].label === label);
              if (key) navigation.navigate('Complaints', {category: key});
            }} />
            <ChartCard title="By zone" rows={zoneRows} total={Math.max(1, complaints.length)} onPress={label => navigation.navigate('Complaints', {zone: label})} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function QueueRow({children}: {children: React.ReactNode}) {
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessible={false}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={{height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: hover ? '#F9FAFB' : '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
      {children}
    </Pressable>
  );
}

function ChartCard({title, rows, total, onPress}: {title: string; rows: [string, number][]; total: number; onPress: (label: string) => void}) {
  return (
    <View style={{backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 12}}>
      <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827', marginBottom: 4}}>{title}</Text>
      {rows.length ? rows.map(([label, value]) => {
        const share = Math.round((value / total) * 100);
        return (
          <TouchableOpacity key={label} onPress={() => onPress(label)} style={{height: 32, flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Text numberOfLines={1} style={{width: 88, fontSize: 13, lineHeight: 18, color: '#111827'}}>{label}</Text>
            <View style={{flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F3F4F6'}}>
              <View style={{width: `${Math.max(4, share)}%`, height: 6, borderRadius: 3, backgroundColor: '#0F3D3A'}} />
            </View>
            <Text style={{width: 24, textAlign: 'right', fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#111827', fontVariant: ['tabular-nums']}}>{value}</Text>
            <Text style={{width: 32, textAlign: 'right', fontSize: 12, lineHeight: 16, color: '#6B7280', fontVariant: ['tabular-nums']}}>{share}%</Text>
          </TouchableOpacity>
        );
      }) : <Text style={{fontSize: 13, lineHeight: 18, color: '#4B5563', height: 32}}>No complaints yet.</Text>}
    </View>
  );
}
