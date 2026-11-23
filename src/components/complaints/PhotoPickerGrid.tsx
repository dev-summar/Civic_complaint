import React from 'react';
import {View, Image, StyleSheet, Alert, Platform} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useTheme} from '@/theme';
import {AppIcon, Text} from '@/components/ui';
import {capturePhoto, pickPhotoFromLibrary} from '@/utils/photo';

export interface PhotoItem {
  uri: string;
  name: string;
  type: string;
  base64?: string;
}

interface PhotoPickerGridProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
  addLabel?: string;
  removeLabel?: string;
}

export function PhotoPickerGrid({photos, onChange, maxPhotos = 5, addLabel = 'Add photo', removeLabel = 'Remove photo'}: PhotoPickerGridProps) {
  const {colors, spacing, radius} = useTheme();

  const addPhoto = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Photos', 'Photo picker is limited on web preview.');
      return;
    }
    Alert.alert('Add Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: () => {
          capturePhoto().then(photo => {
            if (photo) onChange([...photos, photo].slice(0, maxPhotos));
          });
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          pickPhotoFromLibrary().then(photo => {
            if (photo) onChange([...photos, photo].slice(0, maxPhotos));
          });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const remove = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <View style={[styles.grid, {gap: spacing.sm}]}>
      {photos.map((photo, i) => (
        <View key={photo.uri} style={styles.photoWrap}>
          <Image
            source={{uri: photo.uri}}
            style={[
              styles.photo,
              {borderRadius: radius.md, backgroundColor: colors.border},
            ]}
          />
          <TouchableOpacity
            accessibilityRole="button" accessibilityLabel={removeLabel} hitSlop={12}
            style={[styles.removeBtn, {backgroundColor: colors.white}]}
            onPress={() => remove(i)}>
            <AppIcon name="x" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      {photos.length < maxPhotos ? (
        <TouchableOpacity
          accessibilityRole="button" accessibilityLabel={addLabel}
          style={[
            styles.addBtn,
            {
              borderRadius: radius.md,
              borderColor: colors.primary,
            },
          ]}
          onPress={addPhoto}>
          <AppIcon name="camera" size={28} color={colors.primary} />
          <Text variant="caption" color={colors.primary}>
            {addLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 90,
    height: 90,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 11,
  },
  addBtn: {
    width: 90,
    height: 90,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});

export default PhotoPickerGrid;
