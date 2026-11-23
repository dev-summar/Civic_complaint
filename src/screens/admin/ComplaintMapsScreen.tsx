import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Image, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppIcon, Screen, Text} from '@/components/ui';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {ComplaintMap} from '@/components/maps';
import {zoomMapHost, type MapBasemap} from '@/components/maps/WebMapFrame';
import {fonts} from '@/theme/typography';
import {STATUS_TRAIL_LABELS, STATUS_TRAIL_STAGES, statusToTrailIndex} from '@/theme';
import {useComplaintStore} from '@/store/complaintStore';
import {listComplaints} from '@/services/complaint.service';
import * as userService from '@/services/user.service';
import {useLocation} from '@/hooks/useLocation';
import {CATEGORY_META, COMPLAINT_CATEGORIES} from '@/constants';
import {getComplaintCoords} from '@/utils/assignment';
import {scriptTextStyle} from '@/utils/scriptText';
import type {AdminStackParamList} from '@/navigation/types';
import type {Complaint, User} from '@/types';

type StatusChip = 'overdue' | 'new' | 'assigned' | 'in_progress' | 'resolved';
type DateRange = '7d' | '30d' | 'all';

const OVERLAY = {
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  shadowColor: '#111827',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: {width: 0, height: 4},
  elevation: 3,
} as const;

function placeOf(item: Complaint) {
  if (item.location?.address) return item.location.address;
  if (item.address) return item.address;
  if (typeof item.zone === 'object' && item.zone) return item.zone.name;
  return 'Location not set';
}

function isOverdue(item: Complaint) {
  const due = item.resolutionDueAt || item.assignmentDueAt;
  const closed = ['resolved', 'closed', 'rejected'].includes(item.status);
  return !!due && !closed && Date.parse(due) <= Date.now();
}

function ageOf(item: Complaint) {
  if (isOverdue(item)) {
    const due = Date.parse(item.resolutionDueAt || item.assignmentDueAt || '');
    const days = Math.max(1, Math.ceil((Date.now() - due) / 86400000));
    return {label: `${days}d overdue`, overdue: true};
  }
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(item.createdAt)) / 3600000));
  return {label: hours < 48 ? `${hours}h old` : `${Math.round(hours / 24)}d old`, overdue: false};
}

function statusLabel(status: string) {
  if (status === 'closed') return 'Resolved';
  if (status === 'acknowledged') return 'Verified';
  return STATUS_TRAIL_LABELS[status as keyof typeof STATUS_TRAIL_LABELS] ?? status.replace('_', ' ');
}

function statusPillColor(item: Complaint) {
  if (isOverdue(item)) return {bg: '#FEF2F2', text: '#B91C1C'};
  if (item.status === 'resolved' || item.status === 'closed') return {bg: '#ECFDF5', text: '#15803D'};
  if (item.status === 'assigned' || item.status === 'in_progress') return {bg: '#EFF6FF', text: '#2563EB'};
  return {bg: '#FFFBEB', text: '#D97706'};
}

function chipMatch(item: Complaint, chip: StatusChip) {
  if (chip === 'overdue') return isOverdue(item);
  if (chip === 'new') return item.status === 'submitted' || item.status === 'acknowledged';
  if (chip === 'assigned') return item.status === 'assigned';
  if (chip === 'in_progress') return item.status === 'in_progress';
  return item.status === 'resolved' || item.status === 'closed';
}

function readComplaintParam() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('complaint');
}

function writeComplaintParam(id: string | null) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('complaint', id);
  else url.searchParams.delete('complaint');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function inBounds(item: Complaint, bounds: {north: number; south: number; east: number; west: number} | null) {
  const coords = getComplaintCoords(item);
  if (!coords || !bounds) return true;
  return coords.latitude <= bounds.north && coords.latitude >= bounds.south
    && coords.longitude <= bounds.east && coords.longitude >= bounds.west;
}

function haversineM(a: {latitude: number; longitude: number}, b: {latitude: number; longitude: number}) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export default function ComplaintMapsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const {width, height: windowHeight} = useWindowDimensions();
  const sheet = width < 1024;
  const assign = useComplaintStore(state => state.assign);
  const {location, refresh} = useLocation(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(readComplaintParam());
  const [clusterIds, setClusterIds] = useState<string[] | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<StatusChip[]>(['overdue', 'new', 'assigned', 'in_progress', 'resolved']);
  const [category, setCategory] = useState('all');
  const [range, setRange] = useState<DateRange>('all');
  const [basemap, setBasemap] = useState<MapBasemap>('positron');
  const [heatmap, setHeatmap] = useState(false);
  const [bounds, setBounds] = useState<{north: number; south: number; east: number; west: number; zoom: number} | null>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mapHost = useRef<HTMLElement | null>(null);

  const load = useCallback(() => {
    listComplaints().then(items => {
      setComplaints(items);
      const fromUrl = readComplaintParam();
      if (fromUrl && items.some(item => item._id === fromUrl)) setActiveId(fromUrl);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    userService.listWorkers().then(setWorkers).catch(() => {});
  }, [load]));

  useEffect(() => {
    writeComplaintParam(activeId);
  }, [activeId]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveId(null);
        setClusterIds(null);
        setPickerOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const host = document.querySelector('[data-map-host="true"]') as HTMLElement | null;
    mapHost.current = host;
  });

  const counts = useMemo(() => ({
    overdue: complaints.filter(isOverdue).length,
    new: complaints.filter(item => item.status === 'submitted' || item.status === 'acknowledged').length,
    assigned: complaints.filter(item => item.status === 'assigned').length,
    in_progress: complaints.filter(item => item.status === 'in_progress').length,
    resolved: complaints.filter(item => item.status === 'resolved' || item.status === 'closed').length,
  }), [complaints]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const oldest = range === '7d' ? Date.now() - 7 * 86400000 : range === '30d' ? Date.now() - 30 * 86400000 : 0;
    return complaints.filter(item => {
      if (!getComplaintCoords(item)) return false;
      if (!chips.some(chip => chipMatch(item, chip))) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (oldest && Date.parse(item.createdAt) < oldest) return false;
      if (!needle) return true;
      return `${item.title} ${item.description} ${placeOf(item)}`.toLowerCase().includes(needle);
    });
  }, [complaints, chips, category, range, query]);

  const active = complaints.find(item => item._id === activeId) ?? null;
  const cluster = clusterIds
    ? clusterIds.map(id => complaints.find(item => item._id === id)).filter((item): item is Complaint => !!item)
    : null;

  const inView = useMemo(() => visible
    .filter(item => inBounds(item, bounds))
    .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || Date.parse(a.createdAt) - Date.parse(b.createdAt)),
  [visible, bounds]);

  const hotspots = useMemo(() => {
    const open = visible.filter(item => !['resolved', 'closed', 'rejected'].includes(item.status));
    const used = new Set<string>();
    const groups: {id: string; label: string; count: number; center: {latitude: number; longitude: number}}[] = [];
    open.forEach(item => {
      if (used.has(item._id)) return;
      const coords = getComplaintCoords(item);
      if (!coords) return;
      const near = open.filter(other => {
        const otherCoords = getComplaintCoords(other);
        return other.category === item.category && otherCoords && haversineM(coords, otherCoords) <= 300;
      });
      if (near.length < 3) return;
      near.forEach(member => used.add(member._id));
      const points = near.map(member => getComplaintCoords(member)!);
      groups.push({
        id: `hot-${item._id}`,
        label: CATEGORY_META[item.category]?.label ?? 'Hotspot',
        count: near.length,
        center: {
          latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
          longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
        },
      });
    });
    return groups.slice(0, 4);
  }, [visible]);

  const select = (item: Complaint, peers?: Complaint[]) => {
    setActiveId(item._id);
    setClusterIds(peers && peers.length > 1 ? peers.map(peer => peer._id) : null);
    setPickerOpen(false);
  };

  const clear = () => {
    setActiveId(null);
    setClusterIds(null);
    setPickerOpen(false);
  };

  const moveCluster = (direction: -1 | 1) => {
    if (!cluster || !active) return;
    const index = cluster.findIndex(item => item._id === active._id);
    const next = cluster[(index + direction + cluster.length) % cluster.length];
    if (next) setActiveId(next._id);
  };

  const toggleChip = (chip: StatusChip) => {
    setChips(current => {
      if (current.includes(chip)) return current.length === 1 ? current : current.filter(item => item !== chip);
      return [...current, chip];
    });
  };

  const panel = (
    <View
      nativeID="complaint-map-panel"
      style={[OVERLAY, sheet
      ? {maxHeight: 360, width: '100%'}
      : {position: 'absolute', top: 16, right: 16, bottom: 16, width: 360, zIndex: 4}]}>
      {loading ? (
        <View style={{padding: 16, gap: 10}}>
          <View style={{height: 140, borderRadius: 8, backgroundColor: '#E5E7EB'}} />
          <View style={{height: 20, width: '70%', borderRadius: 6, backgroundColor: '#E5E7EB'}} />
          <View style={{height: 16, width: '40%', borderRadius: 6, backgroundColor: '#E5E7EB'}} />
          <View style={{height: 48, borderRadius: 8, backgroundColor: '#E5E7EB'}} />
        </View>
      ) : active ? (
        <DetailPanel
          item={active}
          workers={workers}
          cluster={cluster}
          onClose={clear}
          onPrev={() => moveCluster(-1)}
          onNext={() => moveCluster(1)}
          onOpen={() => navigation.navigate('ComplaintDetail', {id: active._id})}
          onAssign={async workerId => {
            await assign(active._id, workerId);
            setPickerOpen(false);
            load();
          }}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
        />
      ) : (
        <View style={{flex: 1, minHeight: 0}}>
          <View style={{paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'center'}}>
            <Text style={{flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}}>In this view · {inView.length}</Text>
          </View>
          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 12}}>
            {inView.length ? inView.map(item => {
              const age = ageOf(item);
              const meta = CATEGORY_META[item.category] ?? CATEGORY_META.others;
              return (
                <Pressable
                  key={item._id}
                  onPress={() => select(item)}
                  onHoverIn={() => setHoverId(item._id)}
                  onHoverOut={() => setHoverId(null)}
                  style={{paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: hoverId === item._id ? '#F9FAFB' : '#FFFFFF'}}>
                  <Text numberOfLines={1} style={[{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827'}, scriptTextStyle(item.title)]}>{item.title}</Text>
                  <Text numberOfLines={1} style={{fontSize: 12, lineHeight: 16, color: '#6B7280', marginTop: 2}}>{meta.label} · {placeOf(item)}</Text>
                  <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: age.overdue ? '#B91C1C' : '#6B7280', marginTop: 2}}>{age.label}</Text>
                </Pressable>
              );
            }) : (
              <Text style={{padding: 16, fontSize: 14, lineHeight: 20, color: '#4B5563'}}>No complaints in this map view. Pan or clear filters.</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <Screen frame="fill" edges={[]} style={{backgroundColor: '#F7F8F7'}}>
      <View
        style={{flex: 1, position: 'relative', overflow: 'hidden'}}
        onLayout={event => {
          const next = Math.round(event.nativeEvent.layout.height);
          if (next > 0) setMapHeight(next);
        }}>
        <View style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}}>
          <ComplaintMap
            complaints={visible}
            highlightId={activeId}
            hoverId={hoverId}
            basemap={basemap}
            heatmap={heatmap}
            fitMarkers
            lockView={false}
            height={Math.max(320, mapHeight || Math.round(windowHeight))}
            radiusKm={40}
            userLocation={location}
            style={{borderRadius: 0, borderWidth: 0}}
            onBoundsChange={setBounds}
            onMarkerPress={(item: Complaint) => select(item)}
            onGroupPress={(items: Complaint[]) => select(items[0], items)}
          />
        </View>

        <View style={{position: 'absolute', top: 16, left: 16, zIndex: 4, gap: 8, maxWidth: sheet ? width - 32 : 420}}>
          <View style={[OVERLAY, {paddingHorizontal: 10, paddingVertical: 8, alignSelf: 'flex-start'}]}>
            <Text style={{fontFamily: fonts.body, fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>Complaint Maps</Text>
          </View>
          <View style={[OVERLAY, {padding: 10, gap: 8}]}>
            <View style={{height: 36, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10}}>
              <AppIcon name="search" size={16} color="#6B7280" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search title or area"
                placeholderTextColor="#6B7280"
                style={{flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: '#111827', paddingVertical: 0}}
              />
            </View>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
              {([
                ['overdue', 'Overdue', counts.overdue, '#B91C1C'],
                ['new', 'New', counts.new, '#D97706'],
                ['assigned', 'Assigned', counts.assigned, '#2563EB'],
                ['in_progress', 'In progress', counts.in_progress, '#2563EB'],
                ['resolved', 'Resolved', counts.resolved, '#15803D'],
              ] as const).map(([key, label, count, color]) => {
                const on = chips.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{selected: on}}
                    onPress={() => toggleChip(key)}
                    style={{height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: on ? color : '#E5E7EB', backgroundColor: on ? '#FFFFFF' : '#F9FAFB', flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: color}} />
                    <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#111827'}}>{label} {count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
              <FilterSelect
                label={category === 'all' ? 'Category' : CATEGORY_META[category as keyof typeof CATEGORY_META]?.label ?? category}
                onPress={() => {
                  const keys = ['all', ...COMPLAINT_CATEGORIES];
                  setCategory(keys[(keys.indexOf(category as never) + 1) % keys.length]);
                }}
              />
              {(['7d', '30d', 'all'] as const).map(value => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setRange(value)}
                  style={{height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: range === value ? '#0F3D3A' : '#E5E7EB', backgroundColor: range === value ? '#E6F0EC' : '#FFFFFF', justifyContent: 'center'}}>
                  <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>{value === 'all' ? 'All time' : value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {hotspots.length ? (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                {hotspots.map(spot => (
                  <TouchableOpacity
                    key={spot.id}
                    accessibilityLabel={`${spot.label} hotspot`}
                    onPress={() => {
                      const nearest = visible.find(item => {
                        const coords = getComplaintCoords(item);
                        return coords && haversineM(coords, spot.center) <= 300 && item.category && CATEGORY_META[item.category]?.label === spot.label;
                      });
                      if (nearest) select(nearest);
                    }}
                    style={{height: 28, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', justifyContent: 'center'}}>
                    <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#B91C1C'}}>{spot.label} · {spot.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {!sheet ? panel : null}

        <View style={{position: 'absolute', right: sheet ? 16 : 392, bottom: sheet ? 380 : 16, zIndex: 4, gap: 8}}>
          <ControlButton label="Zoom in" onPress={() => zoomMapHost(mapHost.current, 'in')} text="+" />
          <ControlButton label="Zoom out" onPress={() => zoomMapHost(mapHost.current, 'out')} text="−" />
          <ControlButton label="Locate me" onPress={() => refresh()} icon="navigation" />
          <ControlButton
            label="Toggle map layer"
            onPress={() => setBasemap(current => current === 'satellite' ? 'positron' : 'satellite')}
            icon="layers"
          />
          <ControlButton
            label="Toggle heatmap"
            onPress={() => setHeatmap(value => !value)}
            text="H"
            active={heatmap}
          />
        </View>

        {sheet ? (
          <View style={{position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 5}}>
            {panel}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function FilterSelect({label, onPress}: {label: string; onPress: () => void}) {
  return (
    <TouchableOpacity onPress={onPress} style={{height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center'}}>
      <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#111827'}}>{label}</Text>
    </TouchableOpacity>
  );
}

function ControlButton({
  label, onPress, text, icon, active,
}: {
  label: string;
  onPress: () => void;
  text?: string;
  icon?: 'navigation' | 'layers';
  active?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      onPress={onPress}
      style={[OVERLAY, {width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? '#E6F0EC' : '#FFFFFF'}]}>
      {icon ? <AppIcon name={icon} size={16} color="#0F3D3A" /> : <Text style={{fontSize: 18, lineHeight: 22, fontWeight: '600', color: '#0F3D3A'}}>{text}</Text>}
    </TouchableOpacity>
  );
}

function DetailPanel({
  item, workers, cluster, onClose, onPrev, onNext, onOpen, onAssign, pickerOpen, setPickerOpen,
}: {
  item: Complaint;
  workers: User[];
  cluster: Complaint[] | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpen: () => void;
  onAssign: (workerId: string) => Promise<void>;
  pickerOpen: boolean;
  setPickerOpen: (value: boolean) => void;
}) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.others;
  const age = ageOf(item);
  const pill = statusPillColor(item);
  const stage = Math.min(4, statusToTrailIndex(item.status));
  const photo = item.media?.[0]?.url;
  const assigned = Boolean(item.workerName || item.assigned_worker_id);

  return (
    <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 16}}>
      <View style={{position: 'relative'}}>
        {photo ? (
          <Image source={{uri: photo}} style={{width: '100%', height: 160, backgroundColor: '#E5E7EB'}} />
        ) : (
          <View style={{height: 120, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
            <AppIcon name="camera" size={22} color="#6B7280" />
            <Text style={{fontSize: 12, lineHeight: 16, color: '#6B7280', marginTop: 6}}>No photo</Text>
          </View>
        )}
        <TouchableOpacity accessibilityLabel="Close details" onPress={onClose} style={{position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'}}>
          <AppIcon name="x" size={16} color="#111827" />
        </TouchableOpacity>
        {cluster && cluster.length > 1 ? (
          <View style={{position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6}}>
            <TouchableOpacity accessibilityLabel="Previous in cluster" onPress={onPrev} style={{width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'}}>
              <AppIcon name="chevron-left" size={16} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Next in cluster" onPress={onNext} style={{width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'}}>
              <AppIcon name="chevron-right" size={16} color="#111827" />
            </TouchableOpacity>
            <View style={{height: 32, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center'}}>
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#111827'}}>{cluster.findIndex(entry => entry._id === item._id) + 1}/{cluster.length}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={{paddingHorizontal: 16, paddingTop: 12, gap: 10}}>
        <Text style={[{fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#111827'}, scriptTextStyle(item.title)]}>{item.title}</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
          <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#4B5563', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4}}>{meta.label}</Text>
          <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: pill.text, backgroundColor: pill.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4}}>{statusLabel(item.status)}</Text>
        </View>
        <Text style={{fontSize: 13, lineHeight: 18, color: '#4B5563'}}>
          {placeOf(item)} · <Text style={{color: age.overdue ? '#B91C1C' : '#4B5563', fontWeight: age.overdue ? '600' : '400'}}>{age.label}</Text>
        </Text>
        <Text numberOfLines={2} style={[{fontSize: 14, lineHeight: 20, color: '#111827'}, scriptTextStyle(item.description)]}>{item.description}</Text>

        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4}}>
          {STATUS_TRAIL_STAGES.map((step, index) => (
            <View key={step} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: index <= stage ? '#0F3D3A' : '#D1D5DB'}} />
              {index === stage ? <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>{STATUS_TRAIL_LABELS[step]}</Text> : null}
            </View>
          ))}
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <View style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontSize: 12, fontWeight: '600', color: '#0F3D3A'}}>{(item.workerName || '?').slice(0, 1)}</Text>
          </View>
          <Text style={{flex: 1, fontSize: 14, lineHeight: 20, color: '#111827'}}>{item.workerName || 'Unassigned'}</Text>
          <TouchableOpacity onPress={() => setPickerOpen(!pickerOpen)} style={{height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center'}}>
            <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#111827'}}>Change</Text>
          </TouchableOpacity>
        </View>

        {pickerOpen ? (
          <View style={{borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden'}}>
            {workers.slice(0, 8).map(worker => (
              <TouchableOpacity key={worker._id} onPress={() => { void onAssign(worker._id); }} style={{paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
                <Text style={{fontSize: 13, lineHeight: 18, color: '#111827'}}>{worker.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={{height: 36, borderRadius: 8, backgroundColor: '#0F3D3A', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#FFFFFF'}}>{assigned ? 'Reassign' : 'Assign'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpen}>
          <Text style={{fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#0F3D3A'}}>Open full details</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
