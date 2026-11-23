import React, {useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Screen, Header, Text} from '@/components/ui';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {ComplaintMap} from '@/components/maps';
import {useTheme} from '@/theme';
import {MAP_CITY} from '@/constants';
import {useLocation} from '@/hooks/useLocation';
import {useComplaintStore} from '@/store/complaintStore';
import {getComplaintCoords, haversineKm} from '@/utils/assignment';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {CitizenStackParamList} from '@/navigation/types';

const RADII = [1, 5, 10, 25];

export default function MapScreen() {
  const {colors, spacing, radius} = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<CitizenStackParamList>>();
  const {location, error, isLoading, refresh} = useLocation();
  const nearby = useComplaintStore(s => s.nearby);
  const fetchNearby = useComplaintStore(s => s.fetchNearby);
  const [radiusKm, setRadiusKm] = useState(5);
  const [mapHeight, setMapHeight] = useState(420);

  const focus = location ?? MAP_CITY;

  useEffect(() => {
    fetchNearby(focus.latitude, focus.longitude, (location ? radiusKm : 25) * 1000);
  }, [focus.latitude, focus.longitude, fetchNearby, radiusKm, location]);

  const visible = useMemo(() => {
    const reach = location ? radiusKm : 25;
    return nearby.filter(complaint => {
      const coords = getComplaintCoords(complaint);
      return coords != null && haversineKm(focus, coords) <= reach;
    });
  }, [nearby, focus, location, radiusKm]);

  return (
    <Screen frame="fill">
      <Header panel title="Nearby Issues" subtitle="Complaints around you" />
      <View style={[styles.filters, {paddingHorizontal: spacing.lg, gap: 8}]}>
        {RADII.map(value => {
          const selected = value === radiusKm;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setRadiusKm(value)}
              accessibilityRole="button"
              accessibilityState={{selected}}
              style={{
                height: 32,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                justifyContent: 'center',
                backgroundColor: selected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
              }}>
              <Text variant="caption" color={selected ? '#FFFFFF' : colors.primary} style={{fontWeight: '600', fontVariant: ['tabular-nums']}}>
                {value} km
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!location ? (
        <Text variant="caption" color={colors.neutral500} style={{paddingHorizontal: spacing.lg, marginBottom: 8}}>
          {isLoading
            ? 'Finding your location… the map is showing Jammu until the pin drops.'
            : error
              ? 'Location could not be read. The map is showing Jammu. Allow location and try again.'
              : 'Waiting for a location fix. The map is showing Jammu.'}
        </Text>
      ) : (
        <Text variant="caption" color={colors.neutral500} style={{paddingHorizontal: spacing.lg, marginBottom: 8}}>
          {visible.length} complaint{visible.length === 1 ? '' : 's'} within {radiusKm} km
        </Text>
      )}
      {error && !location ? (
        <TouchableOpacity onPress={refresh} style={{paddingHorizontal: spacing.lg, marginBottom: 8}}>
          <Text variant="caption" color={colors.action} style={{fontWeight: '700'}}>Try location again</Text>
        </TouchableOpacity>
      ) : null}
      <View
        style={[styles.mapWrap, {paddingHorizontal: spacing.lg, paddingBottom: spacing.lg}]}
        onLayout={event => {
          const next = Math.max(280, Math.floor(event.nativeEvent.layout.height));
          setMapHeight(current => (Math.abs(current - next) < 8 ? current : next));
        }}>
        <ComplaintMap
          complaints={visible}
          center={focus}
          userLocation={location}
          radiusKm={location ? radiusKm : 25}
          height={mapHeight}
          fitMarkers={false}
          basemap="positron"
          style={{borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border}}
          onMarkerPress={c => navigation.navigate('ComplaintDetail', {id: c._id})}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8},
  mapWrap: {flex: 1, minHeight: 280},
});
