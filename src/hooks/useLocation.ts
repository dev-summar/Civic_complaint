import {useState, useEffect, useCallback, useRef} from 'react';
import {Platform} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import type {Coordinates} from '@/types';

interface UseLocationResult {
  location: Coordinates | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => void;
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const {PermissionsAndroid} = require('react-native') as typeof import('react-native');
  if (!PermissionsAndroid?.requestMultiple) return true;
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const result = await PermissionsAndroid.requestMultiple([fine, coarse]);
  return result[fine] === PermissionsAndroid.RESULTS.GRANTED
    || result[coarse] === PermissionsAndroid.RESULTS.GRANTED;
}

function readPosition(highAccuracy: boolean, timeout: number, maximumAge: number): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    const onFix = (latitude: number, longitude: number) => resolve({latitude, longitude});
    if (Platform.OS === 'web') {
      const nav = globalThis.navigator as Navigator & {geolocation?: Geolocation};
      if (!nav.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      nav.geolocation.getCurrentPosition(
        pos => onFix(pos.coords.latitude, pos.coords.longitude),
        reject,
        {enableHighAccuracy: highAccuracy, timeout, maximumAge},
      );
      return;
    }
    Geolocation.getCurrentPosition(
      pos => onFix(pos.coords.latitude, pos.coords.longitude),
      reject,
      {enableHighAccuracy: highAccuracy, timeout, maximumAge},
    );
  });
}

export function useLocation(autoFetch = true): UseLocationResult {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchId = useRef<number | null>(null);

  const stopWatch = useCallback(() => {
    if (watchId.current == null) return;
    if (Platform.OS === 'web') globalThis.navigator?.geolocation?.clearWatch(watchId.current);
    else Geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const accept = useCallback((coords: Coordinates) => {
    setLocation(coords);
    setError(null);
    setIsLoading(false);
  }, []);

  const listen = useCallback(() => {
    stopWatch();
    const onFix = (latitude: number, longitude: number) => accept({latitude, longitude});
    if (Platform.OS === 'web') {
      const geo = globalThis.navigator?.geolocation;
      if (!geo) return;
      watchId.current = geo.watchPosition(
        pos => onFix(pos.coords.latitude, pos.coords.longitude),
        () => undefined,
        {enableHighAccuracy: true, timeout: 20000, maximumAge: 10000},
      );
      return;
    }
    watchId.current = Geolocation.watchPosition(
      pos => onFix(pos.coords.latitude, pos.coords.longitude),
      () => undefined,
      {enableHighAccuracy: false, timeout: 20000, maximumAge: 10000, distanceFilter: 15},
    );
  }, [accept, stopWatch]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    requestPermission().then(async granted => {
      if (!granted) {
        setError('Location permission denied');
        setIsLoading(false);
        return;
      }
      try {
        // A cached or network fix drops the pin first. A precise watch can move it after.
        accept(await readPosition(false, 8000, 120000));
      } catch {
        try {
          accept(await readPosition(true, 15000, 0));
        } catch {
          setError('Location could not be read.');
          setIsLoading(false);
        }
      }
      listen();
    });
  }, [accept, listen]);

  useEffect(() => {
    if (autoFetch) refresh();
    return stopWatch;
  }, [autoFetch, refresh, stopWatch]);

  return {location, error, isLoading, refresh};
}

export default useLocation;
