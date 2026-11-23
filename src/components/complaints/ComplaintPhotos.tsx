              import React, {useState} from 'react';
import {View, Image, Modal, ScrollView, StyleSheet, Text} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {colors, spacing, typography} from '@/theme';
import type {ComplaintMedia} from '@/types';

interface ComplaintPhotosProps {
  media?: ComplaintMedia[];
  label?: string;
}

export function ComplaintPhotos({media, label = 'Photo evidence'}: ComplaintPhotosProps) {
  const [open, setOpen] = useState<string | null>(null);
  const photos = (media ?? []).filter(m => m?.url && m.type !== 'video');
  if (!photos.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map(m => (
          <TouchableOpacity key={m.url} onPress={() => setOpen(m.url)}>
            <Image source={{uri: m.url}} style={styles.thumb} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={!!open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(null)}>
        <GestureHandlerRootView style={styles.viewer}>
          {open ? <Image source={{uri: open}} style={styles.full} resizeMode="contain" /> : null}
          <TouchableOpacity onPress={() => setOpen(null)} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginVertical: spacing.lg},
  label: {...typography.label, color: colors.text, marginBottom: spacing.sm},
  thumb: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginRight: spacing.sm,
    backgroundColor: colors.border,
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  full: {width: '100%', height: '80%'},
  close: {
    marginTop: spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  closeText: {color: '#FFFFFF', fontWeight: '700'},
});

export default ComplaintPhotos;
