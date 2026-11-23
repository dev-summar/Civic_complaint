import {Alert, PermissionsAndroid, Platform} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';

export interface CapturedPhoto {
  uri: string;
  name: string;
  type: string;
  base64?: string;
}

const cameraOptions: CameraOptions = {
  mediaType: 'photo',
  cameraType: 'back',
  saveToPhotos: false,
  includeBase64: true,
  quality: 0.4,
  maxWidth: 800,
  maxHeight: 800,
};

const libraryOptions: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  includeBase64: true,
  quality: 0.4,
  maxWidth: 800,
  maxHeight: 800,
};

function toPhoto(asset: Asset): CapturedPhoto | null {
  if (!asset.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo_${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
    base64: asset.base64,
  };
}

async function fitPhoto(photo: CapturedPhoto | null): Promise<CapturedPhoto | null> {
  if (!photo?.base64 || Platform.OS !== 'web' || photo.base64.length < 700_000) return photo;
  const image = new window.Image();
  const source = photo.base64.startsWith('data:')
    ? photo.base64
    : `data:${photo.type || 'image/jpeg'};base64,${photo.base64}`;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Photo could not be prepared'));
    image.src = source;
  });
  const scale = Math.min(1, 800 / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return photo;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.7;
  let url = canvas.toDataURL('image/jpeg', quality);
  while (url.length > 700_000 && quality > 0.35) {
    quality = Math.round((quality - 0.1) * 10) / 10;
    url = canvas.toDataURL('image/jpeg', quality);
  }
  return {
    ...photo,
    uri: url,
    type: 'image/jpeg',
    name: photo.name.replace(/\.\w+$/, '.jpg'),
    base64: url.slice(url.indexOf(',') + 1),
  };
}

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (already) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera permission',
    message: 'SwachhSetu needs the camera to photograph the civic issue.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function capturePhoto(): Promise<CapturedPhoto | null> {
  const allowed = await ensureCameraPermission();
  if (!allowed) {
    Alert.alert('Camera', 'Camera permission is required to take a photo.');
    return null;
  }

  const res = await launchCamera(cameraOptions);
  if (res.didCancel) return null;
  if (res.errorCode) {
    Alert.alert('Camera', res.errorMessage || 'Could not open the camera.');
    return null;
  }
  return fitPhoto(res.assets?.[0] ? toPhoto(res.assets[0]) : null);
}

export async function pickPhotoFromLibrary(): Promise<CapturedPhoto | null> {
  const res = await launchImageLibrary(libraryOptions);
  if (!res || res.didCancel) return null;
  if (res.errorCode) {
    Alert.alert('Photos', res.errorMessage || 'Could not open the gallery.');
    return null;
  }
  return fitPhoto(res.assets?.[0] ? toPhoto(res.assets[0]) : null);
}

export function chooseReportPhoto(): Promise<CapturedPhoto | null> {
  if (Platform.OS === 'web') return pickPhotoFromLibrary();
  return new Promise(resolve => {
    let selecting = false;
    Alert.alert('Add photo', 'Choose a photo of the issue', [
      {text: 'Camera', onPress: () => { selecting = true; capturePhoto().then(resolve).catch(() => resolve(null)); }},
      {text: 'Gallery', onPress: () => { selecting = true; pickPhotoFromLibrary().then(resolve).catch(() => resolve(null)); }},
      {text: 'Cancel', style: 'cancel', onPress: () => resolve(null)},
    ], {cancelable: true, onDismiss: () => { if (!selecting) resolve(null); }});
  });
}
