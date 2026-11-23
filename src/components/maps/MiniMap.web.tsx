import React from 'react';
import {View, Text, StyleSheet, Linking, Pressable} from 'react-native';
import {colors, spacing, radius, typography} from '@/theme';
import {getComplaintCoords} from '@/utils/assignment';
import type {Coordinates} from '@/types';
import {WebMapFrame} from './WebMapFrame';

interface MiniMapProps {
  location: Coordinates | {coordinates?: number[]; latitude?: number; longitude?: number};
  height?: number;
}

export function MiniMap({location, height = 220}: MiniMapProps) {
  const coords = getComplaintCoords({location});
  if (!coords) return null;

  return (
    <View style={[styles.wrap, {borderRadius: radius.sm}]}>
      <WebMapFrame
        latitude={coords.latitude}
        longitude={coords.longitude}
        zoom={16}
        height={height}
        fitMarkers={false}
        basemap="positron"
        showControls
        markers={[{id: 'pin', ...coords, title: 'Reported location', color: '#0F3D3A', standalone: true}]}
      />
      <Pressable
        onPress={() =>
          Linking.openURL(
            `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`,
          )
        }
        style={styles.linkRow}>
        <Text style={styles.link}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  link: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default MiniMap;
