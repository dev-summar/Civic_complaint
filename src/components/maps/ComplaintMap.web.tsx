import React, {useMemo} from 'react';
import type {ViewStyle} from 'react-native';
import {MAP_CITY} from '@/constants';
import {getComplaintCoords} from '@/utils/assignment';
import type {Complaint, Coordinates} from '@/types';
import {WebMapFrame, type MapBasemap} from './WebMapFrame';

interface ComplaintMapProps {
  complaints?: Complaint[];
  center?: Coordinates;
  onMarkerPress?: (complaint: Complaint) => void;
  onGroupPress?: (complaints: Complaint[]) => void;
  userLocation?: Coordinates | null;
  height?: number;
  radiusKm?: number;
  highlightId?: string | null;
  hoverId?: string | null;
  basemap?: MapBasemap;
  heatmap?: boolean;
  fitMarkers?: boolean;
  lockView?: boolean;
  onBoundsChange?: (bounds: {north: number; south: number; east: number; west: number; zoom: number}) => void;
  style?: ViewStyle;
}

function zoomForRadius(radiusKm: number) {
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  return 11;
}

function pinColor(item: Complaint) {
  const due = item.resolutionDueAt || item.assignmentDueAt;
  const closed = ['resolved', 'closed', 'rejected'].includes(item.status);
  const overdue = !!due && !closed && Date.parse(due) <= Date.now();
  if (overdue) return '#B91C1C';
  if (item.status === 'resolved' || item.status === 'closed') return '#15803D';
  if (item.status === 'assigned' || item.status === 'in_progress') return '#2563EB';
  if (item.status === 'rejected') return '#6B7280';
  return '#D97706';
}

export function ComplaintMap({
  complaints,
  center,
  onMarkerPress,
  onGroupPress,
  userLocation,
  height = 280,
  radiusKm = 5,
  highlightId,
  hoverId,
  basemap = 'positron',
  heatmap = false,
  fitMarkers = true,
  lockView = false,
  onBoundsChange,
  style,
}: ComplaintMapProps) {
  const markers = useMemo(
    () =>
      (complaints ?? [])
        .map(item => {
          const coords = getComplaintCoords(item);
          if (!coords) return null;
          const due = item.resolutionDueAt || item.assignmentDueAt;
          const closed = ['resolved', 'closed', 'rejected'].includes(item.status);
          const overdue = !!due && !closed && Date.parse(due) <= Date.now();
          return {
            id: item._id,
            ...coords,
            title: item.title,
            color: pinColor(item),
            pulse: overdue,
            item,
          };
        })
        .filter(Boolean) as {
        id: string;
        latitude: number;
        longitude: number;
        title?: string;
        color: string;
        pulse?: boolean;
        item: Complaint;
      }[],
    [complaints],
  );

  const focus = center ?? markers[0] ?? MAP_CITY;

  return (
    <WebMapFrame
      latitude={focus.latitude}
      longitude={focus.longitude}
      zoom={zoomForRadius(radiusKm)}
      minZoom={3}
      height={height}
      markers={userLocation
        ? [...markers, {id: '__user', latitude: userLocation.latitude, longitude: userLocation.longitude, title: 'Your location', color: '#2563EB', standalone: true}]
        : markers}
      highlightId={highlightId}
      hoverId={hoverId}
      basemap={basemap}
      heatmap={heatmap}
      fitMarkers={fitMarkers}
      lockView={lockView}
      onBoundsChange={onBoundsChange}
      style={style}
      onMarkerPress={id => {
        const match = markers.find(marker => marker.id === id);
        if (match) onMarkerPress?.(match.item);
      }}
      onGroupPress={ids => {
        const items = ids.map(id => markers.find(marker => marker.id === id)?.item).filter((item): item is Complaint => !!item);
        if (items.length) onGroupPress?.(items);
      }}
    />
  );
}

export default ComplaintMap;
