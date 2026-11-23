import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CitizenStackParamList} from '@/navigation/types';
import {Screen, Header, EmptyState, Card, Button, AppIcon, Text} from '@/components/ui';
import {useTheme} from '@/theme';
import {useAppStore} from '@/store/appStore';
import {useLocation} from '@/hooks/useLocation';
import {formatCoords} from '@/utils/format';

type Props = NativeStackScreenProps<CitizenStackParamList, 'SavedLocations'>;

export default function SavedLocationsScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const savedLocations = useAppStore(s => s.savedLocations);
  const addSavedLocation = useAppStore(s => s.addSavedLocation);
  const removeSavedLocation = useAppStore(s => s.removeSavedLocation);
  const {location} = useLocation(false);

  const saveCurrent = async () => {
    if (!location) return;
    await addSavedLocation({
      id: Date.now().toString(),
      label: `Location ${savedLocations.length + 1}`,
      ...location });
  };

  return (
    <Screen>
      <Header title="Saved Locations" onBack={() => navigation.goBack()} />
      <View style={{paddingHorizontal: spacing.lg, paddingTop: spacing.md}}>
        <Button title="Save Current Location" onPress={saveCurrent} variant="outline" />
      </View>
      <FlatList removeClippedSubviews={false}
        data={savedLocations}
        keyExtractor={item => item.id}
        contentContainerStyle={{padding: spacing.lg, flexGrow: 1}}
        renderItem={({item}) => (
          <Card style={{marginBottom: spacing.md}}>
            <View style={[styles.row, {gap: spacing.md}]}>
              <AppIcon name="map-pin" size={22} color={colors.primary} />
              <View style={styles.text}>
                <Text variant="label">{item.label}</Text>
                <Text variant="caption" muted>
                  {formatCoords(item.latitude, item.longitude)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeSavedLocation(item.id)}>
                <AppIcon name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="map-pin"
            title="No saved locations"
            message="Save frequently used locations for quick reporting."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  text: {flex: 1} });
