import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {AppIcon, LoadingOverlay, Screen, Text} from '@/components/ui';
import {ComplaintMap} from '@/components/maps';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {fonts} from '@/theme/typography';
import {formatDate, formatDateTime, formatRelativeTime} from '@/utils/format';
import {getComplaintCoords} from '@/utils/assignment';
import {getErrorMessage} from '@/services/api';
import {useComplaintStore} from '@/store/complaintStore';
import * as userService from '@/services/user.service';
import {escalateComplaint, updateTriage} from '@/services/complaint.service';
import {CATEGORY_META, PRIORITY_LABELS} from '@/constants';
import type {Priority} from '@/constants/status';
import type {Complaint, User} from '@/types';
import {scriptTextStyle} from '@/utils/scriptText';

const ASSIGNABLE = ['submitted', 'acknowledged', 'assigned', 'in_progress'];
const RESOLVABLE = ['assigned', 'in_progress'];

const STEPS = [
  {key: 'submitted', label: 'Reported'},
  {key: 'acknowledged', label: 'Verified'},
  {key: 'assigned', label: 'Assigned'},
  {key: 'in_progress', label: 'In Progress'},
  {key: 'resolved', label: 'Fixed'},
  {key: 'closed', label: 'Citizen confirmed'},
] as const;

const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  padding: 16,
} as const;

interface ManageComplaintProps {
  id: string;
  title: string;
  onBack: () => void;
}

function displayStatus(status: string) {
  switch (status) {
    case 'submitted':
    case 'draft':
      return 'Reported';
    case 'acknowledged':
      return 'Verified';
    case 'assigned':
    case 'escalated':
      return 'Assigned';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Fixed';
    case 'closed':
      return 'Citizen confirmed';
    case 'rejected':
      return 'Rejected';
    default:
      return status.replace('_', ' ');
  }
}

function statusTone(status: string, overdue: boolean) {
  if (overdue) return {bg: '#FEF2F2', text: '#B91C1C'};
  if (status === 'resolved' || status === 'closed') return {bg: '#ECFDF5', text: '#15803D'};
  if (status === 'assigned' || status === 'in_progress' || status === 'escalated') return {bg: '#EFF6FF', text: '#2563EB'};
  return {bg: '#FFFBEB', text: '#D97706'};
}

function stepIndex(status: string) {
  switch (status) {
    case 'submitted':
    case 'draft':
      return 0;
    case 'acknowledged':
      return 1;
    case 'assigned':
    case 'escalated':
      return 2;
    case 'in_progress':
      return 3;
    case 'resolved':
      return 4;
    case 'closed':
      return 5;
    default:
      return 0;
  }
}

function ageLabel(createdAt: string) {
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(createdAt)) / 3600000));
  if (hours < 48) return `${hours}h old`;
  return `${Math.round(hours / 24)}d old`;
}

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

type ActorFilter = 'all' | 'system' | 'worker' | 'citizen' | 'admin';

function actorKind(event: {action?: string; description?: string; role?: string}): ActorFilter {
  const blob = `${event.action ?? ''} ${event.description ?? ''} ${event.role ?? ''}`.toLowerCase();
  if (blob.includes('citizen') || blob.includes('closure confirmed') || blob.includes('reopened')) return 'citizen';
  if (blob.includes('worker') || blob.includes('field') || blob.includes('job')) return 'worker';
  if (blob.includes('admin') || blob.includes('officer') || blob.includes('triage') || blob.includes('assign')) return 'admin';
  return 'system';
}

function actorColor(kind: ActorFilter) {
  if (kind === 'worker') return '#2563EB';
  if (kind === 'citizen') return '#D97706';
  if (kind === 'admin') return '#0F3D3A';
  return '#6B7280';
}

export function ManageComplaint({id, title, onBack}: ManageComplaintProps) {
  const desktop = useDesktopLayout();
  const selected = useComplaintStore(s => s.selected);
  const timeline = useComplaintStore(s => s.timeline);
  const comments = useComplaintStore(s => s.comments);
  const isLoading = useComplaintStore(s => s.isLoading);
  const fetchOne = useComplaintStore(s => s.fetchOne);
  const fetchTimeline = useComplaintStore(s => s.fetchTimeline);
  const fetchComments = useComplaintStore(s => s.fetchComments);
  const assign = useComplaintStore(s => s.assign);
  const resolve = useComplaintStore(s => s.resolve);
  const addComment = useComplaintStore(s => s.addComment);

  const [workers, setWorkers] = useState<User[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [priorityReason, setPriorityReason] = useState('');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<ActorFilter>('all');
  const [descOpen, setDescOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await Promise.all([fetchOne(id), fetchTimeline(id), fetchComments(id)]);
  }, [id, fetchOne, fetchTimeline, fetchComments]);

  useEffect(() => {
    refresh();
    userService.listWorkers().then(setWorkers).catch(() => setWorkers([]));
  }, [refresh]);

  const c = selected && selected._id === id ? selected : null;
  const category = c ? CATEGORY_META[c.category as keyof typeof CATEGORY_META] ?? CATEGORY_META.others : null;
  const coords = c ? getComplaintCoords(c) : null;
  const overdue = c ? isOverdue(c) : false;
  const tone = c ? statusTone(c.status, overdue) : statusTone('submitted', false);
  const current = c ? stepIndex(c.status) : 0;
  const canAssign = !!c && ASSIGNABLE.includes(c.status);
  const canResolve = !!c && RESOLVABLE.includes(c.status);
  const assigned = Boolean(c?.assigned_worker_id || c?.workerName);

  const beforePhotos = c?.beforePhotos?.length ? c.beforePhotos : c?.media ?? [];
  const afterPhotos = c?.afterPhotos ?? [];

  const feed = useMemo(() => {
    const events = timeline.map((event, index) => {
      const kind = actorKind(event);
      return {
        id: event._id || `evt-${index}`,
        kind,
        title: event.action || event.status || 'Update',
        body: event.description || event.note || '',
        at: event.createdAt || event.at || '',
        quote: false,
      };
    });
    const notes = comments.map((comment, index) => ({
      id: comment._id || `cmt-${index}`,
      kind: 'admin' as ActorFilter,
      title: 'Internal note',
      body: comment.text,
      at: comment.createdAt || '',
      quote: true,
    }));
    return [...events, ...notes]
      .filter(item => filter === 'all' || item.kind === filter)
      .sort((a, b) => Date.parse(b.at || '0') - Date.parse(a.at || '0'));
  }, [timeline, comments, filter]);

  const sla = useMemo(() => {
    if (!c?.resolutionDueAt && !c?.assignmentDueAt) {
      return {label: '—', state: 'unknown' as const};
    }
    const due = c.resolutionDueAt || c.assignmentDueAt!;
    const dueDate = formatDate(due);
    if (['resolved', 'closed'].includes(c.status)) {
      const finished = Date.parse(c.updatedAt);
      const met = finished <= Date.parse(due);
      return {label: dueDate, state: met ? 'met' as const : 'breached' as const};
    }
    return {label: dueDate, state: Date.now() > Date.parse(due) ? 'breached' as const : 'open' as const};
  }, [c]);

  const autoCloseDays = useMemo(() => {
    if (!c || c.status !== 'resolved') return null;
    const resolvedAt = Date.parse(c.updatedAt);
    if (!Number.isFinite(resolvedAt)) return 7;
    const closes = resolvedAt + 7 * 86400000;
    return Math.max(0, Math.ceil((closes - Date.now()) / 86400000));
  }, [c]);

  const runAssign = async (workerId: string) => {
    setBusy('assign');
    try {
      await assign(id, workerId);
      setAssignOpen(false);
      await refresh();
    } catch (err) {
      Alert.alert('Assignment failed', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const runResolve = async () => {
    if (resolveNotes.trim().length < 5) {
      Alert.alert('Notes required', 'Add at least 5 characters about what was fixed.');
      return;
    }
    setBusy('resolve');
    try {
      await resolve(id, resolveNotes.trim());
      setResolveNotes('');
      setResolveOpen(false);
      await refresh();
    } catch (err) {
      Alert.alert('Resolve failed', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const runPriority = async () => {
    if (!priority || !priorityReason.trim()) return;
    setBusy('priority');
    try {
      await updateTriage(id, priority, priorityReason.trim());
      setPriorityOpen(false);
      setPriority(null);
      setPriorityReason('');
      await refresh();
    } catch (err) {
      Alert.alert('Priority update failed', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const runEscalate = async () => {
    setBusy('escalate');
    setMenuOpen(false);
    try {
      await escalateComplaint(id);
      await refresh();
    } catch (err) {
      Alert.alert('Escalate failed', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const sendNote = async () => {
    if (!note.trim()) return;
    setBusy('note');
    try {
      await addComment(id, note.trim());
      setNote('');
      await fetchComments(id);
    } catch (err) {
      Alert.alert('Note failed', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const disabledTip = (message: string) => {
    setTip(message);
    setTimeout(() => setTip(null), 2400);
  };

  if (!c) {
    return (
      <Screen frame="fill" edges={[]} style={{backgroundColor: '#F7F8F7'}}>
        <LoadingOverlay visible={isLoading} />
        <View style={{height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB'}}>
          <TouchableOpacity onPress={onBack} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <AppIcon name="chevron-left" size={18} color="#0F3D3A" />
            <Text style={{fontSize: 14, color: '#0F3D3A', fontWeight: '600'}}>{title}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const primaryActions = () => {
    if (['submitted', 'acknowledged'].includes(c.status)) {
      return (
        <ActionButton label="Assign" primary onPress={() => setAssignOpen(true)} />
      );
    }
    if (c.status === 'assigned') {
      return (
        <>
          <ActionButton label="Reassign" onPress={() => setAssignOpen(true)} />
          <ActionButton
            label="Mark in progress"
            onPress={() => disabledTip('TODO: no admin start-work endpoint yet')}
            disabled
          />
        </>
      );
    }
    if (c.status === 'in_progress') {
      return (
        <>
          <ActionButton label="Reassign" onPress={() => setAssignOpen(true)} />
          <ActionButton label="Mark fixed" primary onPress={() => setResolveOpen(true)} />
        </>
      );
    }
    if (c.status === 'resolved') {
      return (
        <>
          <ActionButton label="Close now" onPress={() => disabledTip('TODO: close is citizen-only via /confirm')} disabled />
          <ActionButton label="Reopen" onPress={() => disabledTip('TODO: reopen is citizen-only via /confirm')} disabled />
        </>
      );
    }
    if (c.status === 'closed') {
      return (
        <ActionButton label="Reopen" onPress={() => disabledTip('TODO: reopen is citizen-only via /confirm')} disabled />
      );
    }
    return null;
  };

  const left = (
    <View style={{flexGrow: 3, flexShrink: 1, flexBasis: desktop ? 0 : '100%', width: desktop ? undefined : '100%', maxWidth: desktop ? '100%' : undefined, gap: 16, ...(desktop ? {flex: 3} : null)}}>
      <View style={CARD}>
        <CompactStepper current={current} />
      </View>

      <View style={CARD}>
        <Text style={labelStyle}>Photos</Text>
        <PhotoStrip
          before={beforePhotos}
          after={afterPhotos}
          onOpen={setLightbox}
        />
      </View>

      <View style={CARD}>
        <Text style={labelStyle}>Description</Text>
        <Text numberOfLines={descOpen ? undefined : 3} style={[{fontSize: 14, lineHeight: 20, color: '#111827', marginTop: 6}, scriptTextStyle(c.description)]}>
          {c.description || 'No description provided.'}
        </Text>
        {(c.description?.length ?? 0) > 140 ? (
          <TouchableOpacity onPress={() => setDescOpen(value => !value)} style={{marginTop: 8}}>
            <Text style={{fontSize: 13, fontWeight: '600', color: '#0F3D3A'}}>{descOpen ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {c.status === 'resolved' ? (
        <View style={{...CARD, backgroundColor: '#FFFBEB', borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#92400E'}}>Awaiting citizen confirmation</Text>
            <Text style={{fontSize: 12, lineHeight: 16, color: '#92400E', marginTop: 2}}>
              Auto-closes in {autoCloseDays ?? '—'} day{(autoCloseDays ?? 0) === 1 ? '' : 's'}
              {c.resolutionNotes ? ` · ${c.resolutionNotes}` : ''}
            </Text>
          </View>
          <ActionButton label="Close now" onPress={() => disabledTip('TODO: close is citizen-only via /confirm')} disabled />
        </View>
      ) : null}

      {c.status === 'submitted' || c.status === 'acknowledged' ? (
        <View style={{...CARD, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE'}}>
          <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#1D4ED8'}}>Next: assign a field worker</Text>
          <Text style={{fontSize: 12, lineHeight: 16, color: '#1D4ED8', marginTop: 2}}>Pick an owner so this complaint can move into progress.</Text>
        </View>
      ) : null}

      {overdue && !['resolved', 'closed'].includes(c.status) ? (
        <View style={{...CARD, backgroundColor: '#FEF2F2', borderColor: '#FECACA'}}>
          <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#B91C1C'}}>SLA breached</Text>
          <Text style={{fontSize: 12, lineHeight: 16, color: '#B91C1C', marginTop: 2}}>Resolution was due {formatDate(c.resolutionDueAt || c.assignmentDueAt)}. Escalate or reassign.</Text>
        </View>
      ) : null}

      <View style={{...CARD, paddingBottom: 12}}>
        <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827', marginBottom: 10}}>Activity</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12}}>
          {(['all', 'system', 'worker', 'citizen', 'admin'] as const).map(value => (
            <TouchableOpacity
              key={value}
              onPress={() => setFilter(value)}
              style={{height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: filter === value ? '#0F3D3A' : '#E5E7EB', backgroundColor: filter === value ? '#E6F0EC' : '#FFFFFF', justifyContent: 'center'}}>
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#0F3D3A'}}>{value[0].toUpperCase() + value.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ActivityList items={feed} />
        <View style={{marginTop: 12, gap: 8}}>
          <Text style={labelStyle}>Add internal note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Visible to staff only"
            placeholderTextColor="#6B7280"
            multiline
            style={{minHeight: 72, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, fontFamily: fonts.body, fontSize: 14, color: '#111827', textAlignVertical: 'top'}}
          />
          <TouchableOpacity onPress={sendNote} disabled={!!busy || !note.trim()} style={{alignSelf: 'flex-end', height: 32, paddingHorizontal: 12, borderRadius: 8, backgroundColor: note.trim() ? '#0F3D3A' : '#E5E7EB', justifyContent: 'center'}}>
            <Text style={{fontSize: 13, fontWeight: '600', color: note.trim() ? '#FFFFFF' : '#6B7280'}}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const right = (
    <View style={{flexGrow: 2, flexShrink: 1, flexBasis: desktop ? 0 : '100%', width: desktop ? undefined : '100%', minWidth: desktop ? 300 : undefined, maxWidth: desktop ? 420 : undefined, gap: 16, ...(desktop ? {flex: 2, position: 'sticky' as 'sticky', top: 24, alignSelf: 'flex-start'} : {})}}>
      <View style={CARD}>
        <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827', marginBottom: 12}}>Details</Text>
        <DetailRow label="Department" value={c.departmentName || (typeof c.department === 'object' && c.department ? c.department.name : '—')} />
        <DetailRow label="Owner" value={c.officerName || 'Duty officer'} />
        <View style={{paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
          <Text style={labelStyle}>Assigned worker</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6}}>
            <View style={{width: 24, height: 24, borderRadius: 12, backgroundColor: '#E6F0EC', alignItems: 'center', justifyContent: 'center'}}>
              <Text style={{fontSize: 12, fontWeight: '600', color: '#0F3D3A'}}>{(c.workerName || '?').slice(0, 1)}</Text>
            </View>
            <Text style={{flex: 1, fontSize: 14, lineHeight: 20, color: '#111827'}}>{c.workerName || 'Unassigned'}</Text>
            {canAssign ? (
              <TouchableOpacity onPress={() => setAssignOpen(true)}>
                <Text style={{fontSize: 12, fontWeight: '600', color: '#0F3D3A'}}>{assigned ? 'Reassign' : 'Assign'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={{paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
          <Text style={labelStyle}>SLA</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6}}>
            <Text style={{fontSize: 14, lineHeight: 20, color: '#111827', fontVariant: ['tabular-nums']}}>{sla.label}</Text>
            {sla.state !== 'unknown' ? (
              <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color: sla.state === 'breached' ? '#B91C1C' : '#15803D', backgroundColor: sla.state === 'breached' ? '#FEF2F2' : '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2}}>
                {sla.state === 'breached' ? 'Breached' : sla.state === 'met' ? 'Met' : 'On track'}
              </Text>
            ) : null}
          </View>
        </View>
        <DetailRow label="Location" value={placeOf(c)} />
        <DetailRow label="Category" value={category?.label ?? c.category} />
        <DetailRow label="Priority" value={PRIORITY_LABELS[c.priority] ?? c.priority} />
      </View>

      <View style={CARD}>
        <Text style={{fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#111827', marginBottom: 10}}>Map</Text>
        {coords ? (
          <ComplaintMap
            complaints={[c]}
            radiusKm={1.5}
            height={240}
            basemap="positron"
            lockView
            style={{borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB'}}
          />
        ) : (
          <View style={{height: 240, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
            <Text style={{fontSize: 13, color: '#6B7280'}}>No map pin on this complaint.</Text>
          </View>
        )}
        <Text style={{fontSize: 12, lineHeight: 16, color: '#6B7280', marginTop: 8}} numberOfLines={2}>
          {placeOf(c)}
          {coords ? ` · ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen frame="fill" edges={[]} style={{backgroundColor: '#F7F8F7'}}>
      <LoadingOverlay visible={!!busy} />
      <View style={{height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 5}}>
        <TouchableOpacity onPress={onBack} accessibilityLabel="Back to complaints" style={{flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, flex: 1}}>
          <AppIcon name="chevron-left" size={18} color="#0F3D3A" />
          <Text numberOfLines={1} style={{fontSize: 14, lineHeight: 20, color: '#4B5563'}}>
            <Text style={{fontWeight: '600', color: '#0F3D3A'}}>{title}</Text>
            {' / '}
            <Text style={{fontVariant: ['tabular-nums'], color: '#6B7280'}}>{id}</Text>
          </Text>
        </TouchableOpacity>
        {tip ? <Text style={{fontSize: 12, color: '#92400E', marginRight: 12}}>{tip}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={{padding: 24, paddingBottom: 48, gap: 16, maxWidth: 1600, width: '100%', alignSelf: 'flex-start'}}>
        <View style={{gap: 12}}>
          <Text style={[{fontFamily: fonts.body, fontSize: 20, lineHeight: 28, fontWeight: '600', color: '#111827'}, scriptTextStyle(c.title)]}>{c.title}</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
            <Chip bg={tone.bg} color={tone.text} label={displayStatus(c.status)} />
            <Chip bg="#F3F4F6" color="#4B5563" label={PRIORITY_LABELS[c.priority] ?? c.priority} />
            <Chip bg="#E6F0EC" color="#0F3D3A" label={category?.label ?? 'Other'} />
            <Text style={{fontSize: 12, lineHeight: 16, color: '#6B7280'}}>Filed {formatDate(c.createdAt)} · {ageLabel(c.createdAt)}</Text>
          </View>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center'}}>
            {primaryActions()}
            {canResolve && c.status !== 'in_progress' ? <ActionButton label="Mark fixed" onPress={() => setResolveOpen(true)} /> : null}
            <View>
              <TouchableOpacity accessibilityLabel="More actions" onPress={() => setMenuOpen(value => !value)} style={{width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'}}>
                <AppIcon name="more" size={16} color="#111827" />
              </TouchableOpacity>
              {menuOpen ? (
                <View style={{position: 'absolute', top: 36, right: 0, width: 200, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', zIndex: 20, overflow: 'hidden'}}>
                  <MenuItem label="Change priority" onPress={() => { setMenuOpen(false); setPriorityOpen(true); setPriority(c.priority); }} />
                  <MenuItem label="Merge duplicate" disabled onPress={() => disabledTip('TODO: merge endpoint not available')} />
                  <MenuItem label="Escalate" onPress={runEscalate} />
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View
          // @ts-expect-error web CSS grid keeps the 1.5 / 1 split reliable
          style={desktop
            ? {display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(300px, 1fr)', gap: 24, alignItems: 'start', width: '100%'}
            : {flexDirection: 'column', gap: 24, width: '100%'}}>
          {left}
          {right}
        </View>
      </ScrollView>

      {assignOpen ? (
        <Sheet title={assigned ? 'Reassign worker' : 'Assign worker'} onClose={() => setAssignOpen(false)}>
          {workers.map(worker => (
            <TouchableOpacity key={worker._id} onPress={() => { void runAssign(worker._id); }} style={{paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
              <Text style={{fontSize: 14, color: '#111827', fontWeight: '600'}}>{worker.name}</Text>
              {worker.phone ? <Text style={{fontSize: 12, color: '#6B7280'}}>{worker.phone}</Text> : null}
            </TouchableOpacity>
          ))}
          {!workers.length ? <Text style={{fontSize: 14, color: '#6B7280'}}>No active field workers.</Text> : null}
        </Sheet>
      ) : null}

      {priorityOpen ? (
        <Sheet title="Change priority" onClose={() => setPriorityOpen(false)}>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12}}>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map(value => (
              <TouchableOpacity key={value} onPress={() => setPriority(value)} style={{height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: priority === value ? '#0F3D3A' : '#E5E7EB', backgroundColor: priority === value ? '#E6F0EC' : '#FFFFFF', justifyContent: 'center'}}>
                <Text style={{fontSize: 12, fontWeight: '600', color: '#0F3D3A'}}>{PRIORITY_LABELS[value]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={priorityReason} onChangeText={setPriorityReason} placeholder="Reason for change" placeholderTextColor="#6B7280" style={{borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12}} />
          <ActionButton label="Save priority" primary disabled={!priority || priority === c.priority || !priorityReason.trim()} onPress={runPriority} />
        </Sheet>
      ) : null}

      {resolveOpen ? (
        <Sheet title="Mark fixed" onClose={() => setResolveOpen(false)}>
          <TextInput value={resolveNotes} onChangeText={setResolveNotes} placeholder="What was fixed? (min 5 characters)" placeholderTextColor="#6B7280" multiline style={{minHeight: 88, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, textAlignVertical: 'top'}} />
          <ActionButton label="Confirm fixed" primary onPress={runResolve} />
        </Sheet>
      ) : null}

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable onPress={() => setLightbox(null)} style={{flex: 1, backgroundColor: 'rgba(17,24,39,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24}}>
          {lightbox ? <Image source={{uri: lightbox}} style={{width: '100%', maxWidth: 960, height: '80%', borderRadius: 10}} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

const labelStyle = {fontSize: 12, lineHeight: 16, fontWeight: '600' as const, color: '#6B7280'};

function Chip({bg, color, label}: {bg: string; color: string; label: string}) {
  return (
    <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '600', color, backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4}}>{label}</Text>
  );
}

function ActionButton({
  label, onPress, primary, disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 8,
        justifyContent: 'center',
        backgroundColor: disabled ? '#F3F4F6' : primary ? '#0F3D3A' : '#FFFFFF',
        borderWidth: primary || disabled ? 0 : 1,
        borderColor: '#E5E7EB',
        opacity: disabled ? 0.7 : 1,
      }}>
      <Text style={{fontSize: 13, lineHeight: 18, fontWeight: '600', color: disabled ? '#6B7280' : primary ? '#FFFFFF' : '#111827'}}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuItem({label, onPress, disabled}: {label: string; onPress: () => void; disabled?: boolean}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{paddingHorizontal: 12, paddingVertical: 10, opacity: disabled ? 0.5 : 1}}>
      <Text style={{fontSize: 13, color: '#111827'}}>{label}</Text>
    </TouchableOpacity>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View style={{paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB'}}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={{fontSize: 14, lineHeight: 20, color: '#111827', marginTop: 4}}>{value}</Text>
    </View>
  );
}

function CompactStepper({current}: {current: number}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
      {STEPS.map((step, index) => {
        const done = index < current;
        const on = index === current;
        return (
          <View key={step.key} style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: done || on ? (done ? '#15803D' : '#0F3D3A') : '#D1D5DB'}} />
            {on ? <Text style={{fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#0F3D3A'}}>{step.label}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function PhotoStrip({
  before, after, onOpen,
}: {
  before: {url: string}[];
  after: {url: string}[];
  onOpen: (url: string) => void;
}) {
  const slots = [
    {label: 'Before', items: before},
    {label: 'After', items: after},
  ];
  return (
    <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
      {slots.map(slot => (
        <View key={slot.label} style={{flex: 1}}>
          <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 6}}>{slot.label}</Text>
          {slot.items[0]?.url ? (
            <TouchableOpacity onPress={() => onOpen(slot.items[0].url)}>
              <Image source={{uri: slot.items[0].url}} style={{width: '100%', height: 120, borderRadius: 8, backgroundColor: '#E5E7EB'}} />
            </TouchableOpacity>
          ) : (
            <View style={{height: 120, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB'}}>
              <AppIcon name="camera" size={18} color="#6B7280" />
              <Text style={{fontSize: 12, color: '#6B7280', marginTop: 6}}>No photo</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function ActivityList({items}: {items: {id: string; kind: ActorFilter; title: string; body: string; at: string; quote: boolean}[]}) {
  if (!items.length) {
    return <Text style={{fontSize: 14, color: '#6B7280', paddingVertical: 8}}>No activity yet.</Text>;
  }
  return (
    <View>
      {items.map((item, index) => (
        <View key={item.id} style={{flexDirection: 'row', gap: 10}}>
          <View style={{alignItems: 'center', width: 16}}>
            <View style={{width: 10, height: 10, borderRadius: 5, backgroundColor: actorColor(item.kind), marginTop: 4}} />
            {index < items.length - 1 ? <View style={{width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 2}} /> : null}
          </View>
          <View style={{flex: 1, paddingBottom: 14}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={{flex: 1, fontSize: 14, fontWeight: '600', color: '#111827'}}>{item.title}</Text>
              <Text
                // @ts-expect-error web title tooltip
                title={item.at ? formatDateTime(item.at) : ''}
                style={{fontSize: 12, color: '#6B7280'}}>
                {formatRelativeTime(item.at)}
              </Text>
            </View>
            {item.body ? (
              <Text style={{fontSize: 13, lineHeight: 18, color: item.quote ? '#4B5563' : '#4B5563', marginTop: 2, fontStyle: item.quote ? 'italic' : 'normal'}}>
                {item.quote ? `“${item.body}”` : item.body}
              </Text>
            ) : null}
            <Text style={{fontSize: 12, color: '#6B7280', marginTop: 2}}>{item.kind[0].toUpperCase() + item.kind.slice(1)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Sheet({title, onClose, children}: {title: string; onClose: () => void; children: React.ReactNode}) {
  return (
    <View style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.35)', justifyContent: 'flex-end', zIndex: 30}}>
      <Pressable style={{flex: 1}} onPress={onClose} />
      <View style={{backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70%', borderTopWidth: 1, borderColor: '#E5E7EB'}}>
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
          <Text style={{flex: 1, fontSize: 16, fontWeight: '600', color: '#111827'}}>{title}</Text>
          <TouchableOpacity accessibilityLabel="Close sheet" onPress={onClose}>
            <AppIcon name="x" size={18} color="#111827" />
          </TouchableOpacity>
        </View>
        <ScrollView>{children}</ScrollView>
      </View>
    </View>
  );
}

export default ManageComplaint;
