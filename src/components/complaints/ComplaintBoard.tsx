import React, {useCallback, useState} from 'react';
import {FlatList, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen, Header, EmptyState, SegmentedControl, Button, Text} from '@/components/ui';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {ComplaintCard} from './ComplaintCard';
import {ComplaintMap} from '@/components/maps';
import {useDesktopLayout} from '@/hooks/useDesktopLayout';
import {useTheme} from '@/theme';
import {useComplaintStore} from '@/store/complaintStore';
import {listComplaints} from '@/services/complaint.service';
import {getComplaintCoords} from '@/utils/assignment';
import type {ComplaintStatus} from '@/constants/status';

const FILTERS: {label: string; value: string; statuses?: ComplaintStatus[]; empty: string}[] = [
  {label: 'New', value: 'new', statuses: ['submitted', 'acknowledged'], empty: 'No new complaints waiting for a worker.'},
  {label: 'Working', value: 'active', statuses: ['assigned', 'in_progress'], empty: 'No jobs are with field workers right now.'},
  {label: 'To confirm', value: 'review', statuses: ['resolved'], empty: 'Nothing is waiting for citizen confirmation.'},
  {label: 'Closed', value: 'closed', statuses: ['closed', 'rejected'], empty: 'No closed complaints yet.'},
  {label: 'All', value: 'all', empty: 'No complaints yet.'},
  {label: 'Follow-ups', value: 'followups', empty: 'No overdue, escalated or reopened complaints.'},
];

interface ComplaintBoardProps {
  title: string;
  subtitle: string;
  onOpen: (id: string) => void;
  onNotifications?: () => void;
  /** Desktop admin: keep the complaint map beside the list. */
  showMap?: boolean;
}

export function ComplaintBoard({title, subtitle, onOpen, onNotifications, showMap = false}: ComplaintBoardProps) {
  const {colors, spacing} = useTheme();
  const desktop = useDesktopLayout();
  const mapBesideList = showMap && desktop;
  const [filter, setFilter] = useState('all');
  const [mapHeight, setMapHeight] = useState(0);
  const complaints = useComplaintStore(s => s.complaints);
  const fetchAll = useComplaintStore(s => s.fetchAll);
  const isLoading = useComplaintStore(s => s.isLoading);
  const active = FILTERS.find(f => f.value === filter) ?? FILTERS[0];

  const load = useCallback(() => {
    fetchAll(active.statuses ? {status: active.statuses} : undefined);
  }, [fetchAll, active]);

  useFocusEffect(useCallback(() => {
    load();
    let focused = true;
    let refreshing = false;
    const interval = setInterval(async () => {
      if (refreshing || useComplaintStore.getState().isLoading) return;
      refreshing = true;
      try {
        const updated = await listComplaints(active.statuses ? {status: active.statuses} : undefined);
        if (focused) useComplaintStore.setState({complaints: updated});
      } catch {
        // Keep the visible queue while a background refresh is unavailable.
      } finally {
        refreshing = false;
      }
    }, 10000);
    return () => { focused = false; clearInterval(interval); };
  }, [load, active]));

  const visible = filter === 'followups' ? complaints.filter(c => {
    if (['resolved', 'closed', 'rejected'].includes(c.status)) return false;
    const deadline = ['submitted', 'acknowledged'].includes(c.status) ? c.assignmentDueAt : c.resolutionDueAt;
    return !!c.escalatedAt || !!c.reopen_count || (!!deadline && Date.parse(deadline) <= Date.now());
  }) : active.statuses
    ? complaints.filter(c => active.statuses!.includes(c.status))
    : complaints;

  const pinned = visible.filter(complaint => getComplaintCoords(complaint));
  const filters = (
    <View style={{paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm}}>
      {mapBesideList ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {FILTERS.map(item => {
            const selected = item.value === filter;
            return (
              <TouchableOpacity
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{selected}}
                onPress={() => setFilter(item.value)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                }}>
                <Text variant="caption" color={selected ? colors.white : colors.text} style={{fontWeight: '700'}}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <>
          <SegmentedControl
            options={FILTERS.filter(item => item.value !== 'followups').map(item => ({label: item.label, value: item.value}))}
            value={filter}
            onChange={setFilter}
          />
          <Button size="sm" title={filter === 'followups' ? 'Showing follow-ups' : 'Show follow-ups'}
            variant={filter === 'followups' ? 'secondary' : 'ghost'} onPress={() => setFilter(filter === 'followups' ? 'new' : 'followups')} />
        </>
      )}
    </View>
  );
  const list = (
    <FlatList removeClippedSubviews={false}
      data={visible}
      keyExtractor={item => item._id}
      refreshing={isLoading}
      onRefresh={load}
      style={{flex: 1}}
      contentContainerStyle={{padding: spacing.lg, paddingTop: spacing.sm, flexGrow: 1}}
      renderItem={({item, index}) => (
        <ComplaintCard complaint={item} index={index} showAssignee onPress={() => onOpen(item._id)} />
      )}
      ListEmptyComponent={<EmptyState title="Nothing here" message={active.empty} />}
    />
  );

  return (
    <Screen frame="fill">
      <Header panel title={title} subtitle={subtitle}
        rightAction={onNotifications ? <Button title="Alerts" size="sm" variant="outline" onPress={onNotifications} /> : undefined} />
      {mapBesideList ? (
        <View style={{flex: 1, flexDirection: 'row', minHeight: 0}}>
          <View style={{flex: 1.05, minWidth: 380}}>
            {filters}
            {list}
          </View>
          <View style={{flex: 0.95, minWidth: 420, minHeight: 0, paddingRight: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.md}}>
            <View
              onLayout={event => {
                const next = Math.max(280, Math.floor(event.nativeEvent.layout.height - 72));
                setMapHeight(current => (current === next ? current : next));
              }}
              style={{flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 14}}>
              <Text variant="label" color={colors.primary}>Complaint map</Text>
              <Text variant="caption" color={colors.textSecondary} style={{marginBottom: 10}}>
                {pinned.length} pinned in this list
              </Text>
              {mapHeight > 0 ? (
                <ComplaintMap complaints={visible} radiusKm={40} height={mapHeight} onMarkerPress={complaint => onOpen(complaint._id)} />
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <>
          {filters}
          {list}
        </>
      )}
    </Screen>
  );
}

export default ComplaintBoard;
