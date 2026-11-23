import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Image, Platform, ScrollView, TextInput, View} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {AdminTabParamList} from '@/navigation/types';
import {AppIcon, Screen, StatusTrail, Text} from '@/components/ui';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {ComplaintMap} from '@/components/maps';
import {fonts} from '@/theme/typography';
import {useComplaintStore} from '@/store/complaintStore';
import {listComplaints} from '@/services/complaint.service';
import * as userService from '@/services/user.service';
import {CATEGORY_META, PRIORITY_LABELS} from '@/constants';
import {englishGlance, scriptTextStyle} from '@/utils/scriptText';
import type {Complaint, User} from '@/types';
import type {Priority} from '@/constants/status';

const OPEN = ['submitted', 'acknowledged', 'assigned', 'in_progress', 'resolved'];

function placeOf(item: Complaint) {
  if (item.location?.address) return item.location.address;
  if (item.address) return item.address;
  if (typeof item.zone === 'object' && item.zone) return item.zone.name;
  return 'Location not set';
}

function ageOf(item: Complaint) {
  const due = Date.parse(item.resolutionDueAt || item.assignmentDueAt || '');
  const open = !['resolved', 'closed', 'rejected'].includes(item.status);
  if (open && Number.isFinite(due) && due < Date.now()) {
    return {label: `${Math.max(1, Math.ceil((Date.now() - due) / 86400000))}d overdue`, tone: 'overdue' as const};
  }
  if (open && Number.isFinite(due) && due - Date.now() < 86400000) return {label: 'Due today', tone: 'today' as const};
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(item.createdAt)) / 3600000));
  return {label: hours < 48 ? `${hours}h` : `${Math.round(hours / 24)}d`, tone: 'ok' as const};
}

function groupOf(item: Complaint) {
  return ageOf(item).tone === 'overdue' ? 'Overdue' : ageOf(item).tone === 'today' ? 'Due today' : 'On track';
}

export function AdminWorkspace({onOpen}: {onOpen?: (id: string) => void}) {
  const assign = useComplaintStore(state => state.assign);
  const resolve = useComplaintStore(state => state.resolve);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [zone, setZone] = useState('all');
  const [worker, setWorker] = useState('all');
  const [sort, setSort] = useState<'overdue' | 'newest' | 'priority'>('overdue');
  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);
  const route = useRoute<RouteProp<AdminTabParamList, 'Complaints'>>();

  useEffect(() => {
    if (route.params?.category) setCategory(route.params.category);
    if (route.params?.zone) setZone(route.params.zone);
  }, [route.params?.category, route.params?.zone]);

  const load = useCallback(() => {
    listComplaints().then(items => {
      setComplaints(items);
      setActiveId(current => current && items.some(item => item._id === current) ? current : items[0]?._id ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    userService.listWorkers().then(setWorkers).catch(() => {});
  }, [load]));

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

  const zones = useMemo(() => [...new Set(complaints.map(placeOf))].slice(0, 8), [complaints]);
  const counts = {
    new: complaints.filter(item => ['submitted', 'acknowledged'].includes(item.status)).length,
    working: complaints.filter(item => ['assigned', 'in_progress'].includes(item.status)).length,
    review: complaints.filter(item => item.status === 'resolved').length,
    closed: complaints.filter(item => ['closed', 'rejected'].includes(item.status)).length,
    all: complaints.length,
  };
  const visible = complaints.filter(item => {
    if (filter === 'new' && !['submitted', 'acknowledged'].includes(item.status)) return false;
    if (filter === 'working' && !['assigned', 'in_progress'].includes(item.status)) return false;
    if (filter === 'review' && item.status !== 'resolved') return false;
    if (filter === 'closed' && !['closed', 'rejected'].includes(item.status)) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (zone !== 'all' && placeOf(item) !== zone && (typeof item.zone === 'object' && item.zone ? item.zone.name : item.departmentName || 'Unzoned') !== zone) return false;
    if (worker !== 'all' && item.workerName !== worker && item.assigned_worker_id !== worker) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${item.title} ${item.description} ${placeOf(item)} ${item.workerName ?? ''}`.toLowerCase().includes(needle);
  });
  const rank: Record<string, number> = {critical: 0, high: 1, medium: 2, low: 3};
  const sortItems = (items: Complaint[]) => [...items].sort((a, b) => {
    if (sort === 'newest') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (sort === 'priority') return (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4);
    const due = (item: Complaint) => Date.parse(item.resolutionDueAt || item.assignmentDueAt || item.createdAt);
    return due(a) - due(b);
  });
  const groups = ['Overdue', 'Due today', 'On track'].map(name => ({
    name,
    items: sortItems(visible.filter(item => groupOf(item) === name)),
  })).filter(group => group.items.length);
  const active = complaints.find(item => item._id === activeId) ?? null;
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  const runAssign = async (id: string, workerId: string) => {
    await assign(id, workerId);
    setMenuId(null);
    load();
  };

  return (
    <Screen frame="fill">
      <View style={{flex: 1, flexDirection: 'row', minHeight: 0, backgroundColor: '#F7F8F7'}}>
        <View style={{width: 560, minWidth: 420, borderRightWidth: 1, borderRightColor: '#E5E7EB', backgroundColor: '#FFFFFF'}}>
          <View style={{padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
            <Text style={{fontFamily: fonts.body, fontSize: 20, lineHeight: 28, fontWeight: '600', color: '#111827'}}>Complaints</Text>
            <TextInput ref={searchRef} value={query} onChangeText={setQuery} placeholder="Search  (/)" placeholderTextColor="#6B7280" style={{borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, height: 36, fontFamily: fonts.body, fontSize: 14, color: '#111827'}} />
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
              {([['new', `New ${counts.new}`], ['working', `Working ${counts.working}`], ['review', `To confirm ${counts.review}`], ['closed', `Closed ${counts.closed}`], ['all', `All ${counts.all}`]] as const).map(([value, label]) => (
                <TouchableOpacity key={value} onPress={() => setFilter(value)} style={{paddingHorizontal: 8, height: 28, borderRadius: 8, justifyContent: 'center', backgroundColor: filter === value ? '#E6F0EC' : '#FFFFFF', borderWidth: 1, borderColor: filter === value ? '#0F3D3A' : '#E5E7EB'}}>
                  <Text style={{fontSize: 12, fontWeight: '700', color: '#0F3D3A'}}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
              <FilterChip label={category === 'all' ? 'Category' : (CATEGORY_META[category as keyof typeof CATEGORY_META]?.label ?? category)} onPress={() => {
                const keys = ['all', ...Object.keys(CATEGORY_META)];
                setCategory(keys[(keys.indexOf(category) + 1) % keys.length]);
              }} />
              <FilterChip label={zone === 'all' ? 'Zone' : zone} onPress={() => {
                const keys = ['all', ...zones];
                setZone(keys[(keys.indexOf(zone) + 1) % keys.length]);
              }} />
              <FilterChip label={worker === 'all' ? 'Worker' : (workers.find(item => item._id === worker)?.name ?? worker)} onPress={() => {
                const ids = ['all', ...workers.map(item => item._id)];
                setWorker(ids[(ids.indexOf(worker) + 1) % ids.length]);
              }} />
              <FilterChip label={sort === 'overdue' ? 'Most overdue' : sort === 'newest' ? 'Newest' : 'Priority'} onPress={() => setSort(sort === 'overdue' ? 'newest' : sort === 'newest' ? 'priority' : 'overdue')} />
            </View>
          </View>
          {selected.length ? (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E6F0EC'}}>
              <Text style={{flex: 1, fontSize: 13, fontWeight: '700', color: '#0F3D3A'}}>{selected.length} selected</Text>
              {workers[0] ? <TouchableOpacity onPress={() => { void Promise.all(selected.map(id => assign(id, workers[0]._id))).then(load); setSelected([]); }}><Text style={{fontSize: 13, fontWeight: '700', color: '#0F3D3A'}}>Assign to {workers[0].name}</Text></TouchableOpacity> : null}
            </View>
          ) : null}
          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 24}}>
            {loading ? <View style={{margin: 16, height: 240, borderRadius: 12, backgroundColor: '#E7EEEC'}} /> : groups.map(group => (
              <View key={group.name}>
                <Text style={{fontSize: 12, fontWeight: '700', color: group.name === 'Overdue' ? '#B91C1C' : '#4B5563', paddingHorizontal: 16, paddingTop: 12}}>{group.name} · {group.items.length}</Text>
                {group.items.map(item => {
                  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.others;
                  const age = ageOf(item);
                  const glance = englishGlance(item.title, meta.label, item.ai_summary);
                  const on = item._id === activeId;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      onPress={() => setActiveId(item._id)}
                      onHoverIn={() => setHoverId(item._id)}
                      onHoverOut={() => setHoverId(null)}
                      accessibilityLabel={`${item.title} ${meta.label} · ${placeOf(item)} ${age.label} ${PRIORITY_LABELS[item.priority as Priority] ?? item.priority}`}
                      style={{flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: on ? '#F3FAF8' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
                      <TouchableOpacity onPress={() => toggle(item._id)} accessibilityLabel="Select complaint" style={{width: 18, height: 18, marginTop: 2, borderRadius: 4, borderWidth: 1, borderColor: '#8A928F', backgroundColor: selected.includes(item._id) ? '#0F3D3A' : '#FFFFFF'}} />
                      <AppIcon name={meta.icon} size={16} color="#0F3D3A" />
                      {item.media?.[0]?.url ? (
                        <Image source={{uri: item.media[0].url}} style={{width: 36, height: 36, borderRadius: 6, backgroundColor: '#E7EEEC'}} />
                      ) : <View style={{width: 36, height: 36, borderRadius: 6, backgroundColor: '#E7EEEC'}} />}
                      <View style={{flex: 1, minWidth: 0}}>
                        <Text numberOfLines={1} style={[{fontSize: 14, fontWeight: '600', color: '#111827'}, scriptTextStyle(item.title)]}>{item.title}</Text>
                        <Text numberOfLines={1} style={{fontSize: 12, color: '#4B5563'}}>{meta.label}{glance && glance !== meta.label ? ` · ${glance}` : ''} · {placeOf(item)}</Text>
                      </View>
                      <Text style={{fontSize: 12, fontWeight: '700', color: age.tone === 'overdue' ? '#B91C1C' : '#4B5563'}}>{age.label}</Text>
                      <Text style={{fontSize: 12, color: item.priority === 'high' || item.priority === 'critical' ? '#B91C1C' : '#4B5563'}}>{PRIORITY_LABELS[item.priority as Priority] ?? item.priority}</Text>
                      <View style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
                        <Text style={{fontSize: 12, lineHeight: 14, fontWeight: '600', color: '#0F3D3A'}}>{(item.workerName ?? '?').slice(0, 1)}</Text>
                      </View>
                      <TouchableOpacity accessibilityLabel="Row actions" onPress={() => setMenuId(menuId === item._id ? null : item._id)}>
                        <AppIcon name="more" size={16} color="#0F3D3A" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            {menuId ? (
              <View style={{margin: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF'}}>
                <Text style={{fontSize: 12, fontWeight: '700', marginBottom: 6}}>Assign or reassign</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                  {workers.slice(0, 6).map(person => (
                    <TouchableOpacity key={person._id} onPress={() => { void runAssign(menuId, person._id); }} style={{paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E6F0EC'}}>
                      <Text style={{fontSize: 12, fontWeight: '700', color: '#0F3D3A'}}>{person.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
        <View style={{flex: 1, minWidth: 0, padding: 16, gap: 12}}>
          <View style={{flex: 1, minHeight: 280, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 16}}>
            <Text style={{fontSize: 13, fontWeight: '700', color: '#0F3D3A', marginBottom: 8}}>{visible.length} on the map</Text>
            <ComplaintMap complaints={visible} highlightId={hoverId || activeId} radiusKm={40} height={340} onMarkerPress={item => setActiveId(item._id)} />
          </View>
          {active ? (
            <View style={{backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, gap: 8}}>
              <Text style={[{fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#111827'}, scriptTextStyle(active.title)]}>{active.title}</Text>
              <Text style={{fontSize: 13, color: '#4B5563'}}>{CATEGORY_META[active.category]?.label ?? 'Complaint'} · {placeOf(active)} · {active.workerName || 'Unassigned'}</Text>
              <Text style={[{fontSize: 14, color: '#111827'}, scriptTextStyle(active.description)]}>{active.description}</Text>
              <StatusTrail status={active.status} />
              <TouchableOpacity
                accessibilityLabel="Open full details"
                onPress={() => onOpen?.(active._id)}
                style={{alignSelf: 'flex-start', height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#0F3D3A', justifyContent: 'center'}}>
                <Text style={{color: '#FFFFFF', fontWeight: '600', fontSize: 13}}>Open full details</Text>
              </TouchableOpacity>
              {OPEN.includes(active.status) ? (
                <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
                  <TextInput value={notes} onChangeText={setNotes} placeholder="What was fixed?" placeholderTextColor="#6B7280" style={{flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14}} />
                  <TouchableOpacity onPress={() => { if (notes.trim().length >= 5) void resolve(active._id, notes.trim()).then(() => { setNotes(''); load(); }); }} style={{backgroundColor: '#0F3D3A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8}}>
                    <Text style={{color: '#FFFFFF', fontWeight: '700', fontSize: 13}}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function FilterChip({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <TouchableOpacity onPress={onPress} style={{paddingHorizontal: 8, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center'}}>
      <Text style={{fontSize: 12, fontWeight: '600', color: '#111827'}}>{label}</Text>
    </TouchableOpacity>
  );
}

export default AdminWorkspace;
