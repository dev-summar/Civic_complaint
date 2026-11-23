import React from 'react';
import {View} from 'react-native';
import {Text} from '@/components/ui';
import {radius} from '@/theme';
import {MAP_CITY} from '@/constants';
import type {Coordinates} from '@/types';
import {WebMapFrame} from './WebMapFrame';

interface LocationPickerProps {
  value: Coordinates | null;
  onChange: (coords: Coordinates) => void;
  height?: number;
}

export function LocationPicker({value, onChange, height = 240}: LocationPickerProps) {
  const center = value ?? MAP_CITY;

  return (
    <View style={{gap: 8}}>
      <WebMapFrame
        latitude={center.latitude}
        longitude={center.longitude}
        zoom={value ? 16 : 14}
        height={height}
        fitMarkers={false}
        basemap="positron"
        showControls
        markers={value ? [{id: 'pin', latitude: value.latitude, longitude: value.longitude, title: 'Pin', color: '#B91C1C', standalone: true}] : []}
        onMapPress={onChange}
        style={{borderRadius: radius.sm, borderWidth: 1, borderColor: '#E5E7EB'}}
      />
      <Text variant="caption" color="#6B7280">
        Drag to move · tap to drop a pin · use + / − to zoom
      </Text>
    </View>
  );
}

export default LocationPicker;
