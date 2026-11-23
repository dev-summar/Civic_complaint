import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  PanResponder,
  Platform,
  Pressable,
  Text,
  View,
  ViewStyle,
} from 'react-native';

export interface WebMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
  standalone?: boolean;
  pulse?: boolean;
}

export type MapBasemap = 'positron' | 'voyager' | 'satellite';

interface WebMapFrameProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  markers: WebMapMarker[];
  height: number;
  style?: ViewStyle;
  onMarkerPress?: (id: string) => void;
  onGroupPress?: (ids: string[]) => void;
  onMapPress?: (coords: {latitude: number; longitude: number}) => void;
  minZoom?: number;
  highlightId?: string | null;
  hoverId?: string | null;
  basemap?: MapBasemap;
  heatmap?: boolean;
  fitMarkers?: boolean;
  lockView?: boolean;
  showControls?: boolean;
  onBoundsChange?: (bounds: {north: number; south: number; east: number; west: number; zoom: number}) => void;
}

const TILE = 256;
const OVERDUE = '#B91C1C';
const PENDING = '#D97706';
const ASSIGNED = '#2563EB';
const RESOLVED = '#15803D';
// services.* answers tiles about four times faster than server.* from Jammu (about 100 ms vs 420 ms).
const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services';
const NATIVE_LAND = '#F2EFE6';
const prefetched = new Set<string>();

function prefetchTile(url: string) {
  if (prefetched.has(url)) return;
  if (prefetched.size > 600) prefetched.clear();
  prefetched.add(url);
  Image.prefetch(url).catch(() => prefetched.delete(url));
}

/** Opens the connection to the tile server before the first map is shown. */
export function warmMapTiles(latitude = 32.7266, longitude = 74.857) {
  if (Platform.OS === 'web') return;
  const {x, y} = project(latitude, longitude, 15);
  prefetchTile(`${ESRI}/World_Street_Map/MapServer/tile/15/${Math.floor(y / TILE)}/${Math.floor(x / TILE)}`);
}

// CARTO basemaps now return a small "API key required" PNG (onError never fires).
// OSM blocks many clients the same way. Esri tiles need no key on web or native.
function tileUrl(basemap: MapBasemap, level: number, x: number, y: number) {
  const esri = (service: string) => `${ESRI}/${service}/MapServer/tile/${level}/${y}/${x}`;
  if (basemap === 'satellite') {
    return {src: esri('World_Imagery'), fallback: esri('World_Street_Map')};
  }
  if (basemap === 'voyager') {
    return {src: esri('World_Topo_Map'), fallback: esri('World_Street_Map')};
  }
  return {src: esri('World_Street_Map'), fallback: esri('World_Topo_Map')};
}

function MapTile({
  src,
  fallback,
  left,
  top,
  native = false,
  filter,
}: {
  src: string;
  fallback: string;
  left: number;
  top: number;
  native?: boolean;
  filter?: string;
}) {
  const [url, setUrl] = useState(src);
  useEffect(() => setUrl(src), [src]);
  const fail = () => setUrl(current => (current === fallback ? current : fallback));
  if (native) {
    return (
      <Image
        source={{uri: url}}
        fadeDuration={0}
        onError={fail}
        style={{position: 'absolute', left, top, width: TILE, height: TILE}}
      />
    );
  }
  return React.createElement('img', {
    src: url,
    alt: '',
    width: TILE,
    height: TILE,
    draggable: false,
    decoding: 'async',
    onError: fail,
    style: {position: 'absolute', left, top, width: TILE, height: TILE, filter},
  });
}

function tileFilter(basemap: MapBasemap) {
  if (basemap === 'satellite') return undefined;
  return undefined;
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI;
  return {latitude, longitude};
}

function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const sine = Math.sin((latitude * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale;
  return {x, y};
}

function fitZoom(markers: WebMapMarker[], width: number, height: number, fallback: number, minZoom = 3) {
  if (!markers.length || width < 32) return fallback;
  if (markers.length === 1) return 15;
  for (let zoom = 16; zoom >= minZoom; zoom -= 1) {
    const points = markers.map(marker => project(marker.latitude, marker.longitude, zoom));
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    if (Math.max(...xs) - Math.min(...xs) < width - 96 && Math.max(...ys) - Math.min(...ys) < height - 96) {
      return zoom;
    }
  }
  return minZoom;
}

function donutGradient(colors: string[]) {
  if (!colors.length) return RESOLVED;
  const step = 360 / colors.length;
  return `conic-gradient(${colors.map((color, index) => `${color} ${index * step}deg ${(index + 1) * step}deg`).join(', ')})`;
}

function ensurePulseStyle() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('swachh-map-pulse')) return;
  const style = document.createElement('style');
  style.id = 'swachh-map-pulse';
  style.textContent = `
    @keyframes swachh-pin-pulse {
      0% { transform: scale(1); opacity: 0.55; }
      70% { transform: scale(2.1); opacity: 0; }
      100% { transform: scale(2.1); opacity: 0; }
    }
    .swachh-pin-pulse {
      position: absolute;
      inset: -6px;
      border-radius: 999px;
      border: 2px solid ${OVERDUE};
      animation: swachh-pin-pulse 1.8s ease-out infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

export function WebMapFrame({
  latitude,
  longitude,
  zoom = 15,
  minZoom = 3,
  markers,
  height,
  style,
  onMarkerPress,
  onGroupPress,
  onMapPress,
  highlightId,
  hoverId,
  basemap = 'positron',
  heatmap = false,
  fitMarkers = true,
  lockView = false,
  showControls,
  onBoundsChange,
}: WebMapFrameProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [manualCenter, setManualCenter] = useState<{latitude: number; longitude: number} | null>(null);
  const [drag, setDrag] = useState({x: 0, y: 0});
  const dragRef = useRef({x: 0, y: 0});
  const centerRef = useRef({x: 0, y: 0});
  const levelRef = useRef(zoom);
  const widthRef = useRef(0);
  const heightRef = useRef(height);
  const fitted = useRef(false);
  const controls = showControls ?? !lockView;

  useEffect(() => {
    ensurePulseStyle();
  }, []);

  const rememberWidth = (next: number) => {
    if (next > 32) setWidth(current => (Math.abs(current - next) < 1 ? current : next));
  };

  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => rememberWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    if (!lockView) {
      fitted.current = false;
      setManualZoom(null);
      setManualCenter(null);
    }
  }, [markers.length, lockView]);

  useEffect(() => {
    if (!highlightId) return;
    const marker = markers.find(item => item.id === highlightId);
    if (!marker) return;
    setManualCenter({latitude: marker.latitude, longitude: marker.longitude});
    setManualZoom(current => (current == null ? 15 : Math.max(current, 14)));
  }, [highlightId, markers]);

  const autoZoom = fitZoom(markers, width, height, markers.length ? 14 : zoom, Math.min(minZoom, 3));
  const level = manualZoom ?? (fitMarkers ? autoZoom : zoom);
  const focusLat = manualCenter?.latitude ?? latitude;
  const focusLng = manualCenter?.longitude ?? longitude;

  const center = useMemo(() => {
    if (manualCenter || !fitMarkers || markers.length < 2) {
      return project(focusLat, focusLng, level);
    }
    const points = markers.map(marker => project(marker.latitude, marker.longitude, level));
    return {
      x: (Math.min(...points.map(point => point.x)) + Math.max(...points.map(point => point.x))) / 2,
      y: (Math.min(...points.map(point => point.y)) + Math.max(...points.map(point => point.y))) / 2,
    };
  }, [focusLat, focusLng, level, markers, fitMarkers, manualCenter]);

  centerRef.current = center;
  levelRef.current = level;
  widthRef.current = width;
  heightRef.current = height;

  const zoomBy = (delta: number) => {
    setManualZoom(current => Math.max(minZoom, Math.min(18, (current ?? level) + delta)));
    setManualCenter(current => current ?? {latitude: focusLat, longitude: focusLng});
  };

  const commitPan = (dx: number, dy: number) => {
    if (!dx && !dy) return;
    const next = unproject(centerRef.current.x - dx, centerRef.current.y - dy, levelRef.current);
    setManualCenter(next);
    setManualZoom(current => current ?? levelRef.current);
    dragRef.current = {x: 0, y: 0};
    setDrag({x: 0, y: 0});
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          !lockView && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
        onPanResponderGrant: () => {
          dragRef.current = {x: 0, y: 0};
        },
        onPanResponderMove: (_evt, gesture) => {
          dragRef.current = {x: gesture.dx, y: gesture.dy};
          setDrag({x: gesture.dx, y: gesture.dy});
        },
        onPanResponderRelease: (_evt, gesture) => {
          const moved = Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6;
          if (moved) commitPan(gesture.dx, gesture.dy);
          else {
            dragRef.current = {x: 0, y: 0};
            setDrag({x: 0, y: 0});
          }
        },
        onPanResponderTerminate: () => {
          dragRef.current = {x: 0, y: 0};
          setDrag({x: 0, y: 0});
        },
      }),
    [lockView],
  );

  const viewX = center.x - drag.x;
  const viewY = center.y - drag.y;

  useEffect(() => {
    if (width < 32 || !onBoundsChange) return;
    const nw = unproject(viewX - width / 2, viewY - height / 2, level);
    const se = unproject(viewX + width / 2, viewY + height / 2, level);
    onBoundsChange({
      north: nw.latitude,
      south: se.latitude,
      west: nw.longitude,
      east: se.longitude,
      zoom: level,
    });
  }, [viewX, viewY, width, height, level, onBoundsChange]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !host.current) return;
    const node = host.current as HTMLDivElement & {__zoomIn?: () => void; __zoomOut?: () => void};
    node.__zoomIn = () => zoomBy(1);
    node.__zoomOut = () => zoomBy(-1);
  }, [level, focusLat, focusLng, minZoom]);

  const tiles = useMemo(() => {
    if (width < 32) return [];
    const left = viewX - width / 2;
    const top = viewY - height / 2;
    const x0 = Math.floor(left / TILE);
    const x1 = Math.floor((left + width) / TILE);
    const y0 = Math.floor(top / TILE);
    const y1 = Math.floor((top + height) / TILE);
    const count = 2 ** level;
    const cells = [];
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        if (y < 0 || y >= count) continue;
        const wrapped = ((x % count) + count) % count;
        const urls = tileUrl(basemap, level, wrapped, y);
        cells.push({
          key: `${basemap}/${level}/${wrapped}/${y}`,
          src: urls.src,
          fallback: urls.fallback,
          left: x * TILE - left,
          top: y * TILE - top,
        });
      }
    }
    return cells;
  }, [basemap, viewX, viewY, width, height, level]);

  // Load one ring of tiles beyond the edges so a pan shows map, not blank squares.
  const ringKey = width < 32 ? '' : `${basemap}/${level}/${Math.floor((viewX - width / 2) / TILE)}/${Math.floor((viewY - height / 2) / TILE)}`;
  useEffect(() => {
    if (Platform.OS === 'web' || !ringKey) return;
    const left = viewX - width / 2;
    const top = viewY - height / 2;
    const x0 = Math.floor(left / TILE) - 1;
    const x1 = Math.floor((left + width) / TILE) + 1;
    const y0 = Math.floor(top / TILE) - 1;
    const y1 = Math.floor((top + height) / TILE) + 1;
    const count = 2 ** level;
    for (let x = x0; x <= x1; x += 1) {
      for (let y = y0; y <= y1; y += 1) {
        if (y < 0 || y >= count) continue;
        if (x > x0 && x < x1 && y > y0 && y < y1) continue;
        prefetchTile(tileUrl(basemap, level, ((x % count) + count) % count, y).src);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey]);

  const pins = markers.map(marker => {
    const point = project(marker.latitude, marker.longitude, level);
    return {
      ...marker,
      color: marker.color || '#0F3D3A',
      left: point.x - (viewX - width / 2),
      top: point.y - (viewY - height / 2),
    };
  });

  const groups = new Map<string, typeof pins>();
  pins.forEach(pin => {
    if (pin.id === highlightId || pin.standalone) return;
    const key = `${Math.round(pin.left / 40)}:${Math.round(pin.top / 40)}`;
    groups.set(key, [...(groups.get(key) ?? []), pin]);
  });

  const spots = [
    ...[...groups.values()].map(list => ({
      id: list[0].id,
      ids: list.map(pin => pin.id),
      left: list.reduce((sum, pin) => sum + pin.left, 0) / list.length,
      top: list.reduce((sum, pin) => sum + pin.top, 0) / list.length,
      color: list.some(pin => pin.color === OVERDUE || pin.color === '#D64545') ? OVERDUE : list[0].color,
      colors: list.map(pin => pin.color),
      title: list.length > 1 ? `${list.length} complaints` : list[0].title,
      count: list.length,
      hot: false,
      hover: list.some(pin => pin.id === hoverId),
      pulse: list.some(pin => pin.pulse),
    })),
    ...pins.filter(pin => pin.id === highlightId || pin.standalone).map(pin => ({
      ...pin,
      ids: [pin.id],
      colors: [pin.color],
      count: 1,
      hot: pin.id === highlightId,
      hover: pin.id === hoverId,
      pulse: !!pin.pulse,
    })),
  ];

  const openSpot = (pin: {id: string; ids: string[]; count: number}) => {
    if (pin.count > 1 && onGroupPress) onGroupPress(pin.ids);
    else onMarkerPress?.(pin.id);
  };

  const placeFromTouch = (x: number, y: number) => {
    if (!onMapPress || width < 32) return;
    onMapPress(unproject(viewX - width / 2 + x, viewY - height / 2 + y, level));
  };

  const ZoomControls = () =>
    controls ? (
      <View style={{position: 'absolute', right: 10, bottom: 36, gap: 6, zIndex: 8}}>
        <Pressable
          accessibilityLabel="Zoom in"
          onPress={() => zoomBy(1)}
          style={{width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: '#0F3D3A', lineHeight: 20}}>+</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Zoom out"
          onPress={() => zoomBy(-1)}
          style={{width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 18, fontWeight: '700', color: '#0F3D3A', lineHeight: 20}}>−</Text>
        </Pressable>
      </View>
    ) : null;

  const Attribution = () => (
    <View style={{position: 'absolute', left: 10, bottom: 8, zIndex: 6, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2}}>
      <Text style={{fontSize: 10, color: '#4B5563'}}>© Esri</Text>
    </View>
  );

  const heat = heatmap
    ? pins.filter(pin => !pin.standalone).map(pin => ({
        id: `heat-${pin.id}`,
        left: pin.left,
        top: pin.top,
        color: pin.color,
      }))
    : [];

  const renderNative = () => (
    <View
      onLayout={event => rememberWidth(event.nativeEvent.layout.width)}
      style={[{height, width: '100%', overflow: 'hidden', backgroundColor: basemap === 'satellite' ? '#2B3A2E' : NATIVE_LAND, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB'}, style]}
      {...(lockView ? {} : panResponder.panHandlers)}>
      {tiles.map(tile => (
        <MapTile key={tile.key} src={tile.src} fallback={tile.fallback} left={tile.left} top={tile.top} native />
      ))}
      {onMapPress ? (
        <Pressable
          style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.01)'}}
          onPress={event => {
            if (Math.abs(dragRef.current.x) > 6 || Math.abs(dragRef.current.y) > 6) return;
            placeFromTouch(event.nativeEvent.locationX, event.nativeEvent.locationY);
          }}
        />
      ) : null}
      {spots.map(pin => (
        <Pressable
          key={pin.id}
          accessibilityLabel={pin.title}
          onPress={() => openSpot(pin)}
          style={{
            position: 'absolute',
            left: pin.left - (pin.count > 1 ? 18 : pin.hot ? 11 : 8),
            top: pin.top - (pin.count > 1 ? 18 : pin.hot ? 11 : 8),
            width: pin.count > 1 ? 36 : pin.hot ? 22 : 16,
            height: pin.count > 1 ? 36 : pin.hot ? 22 : 16,
            borderWidth: pin.hot ? 3 : 2,
            borderColor: pin.hot ? '#111827' : '#FFFFFF',
            borderRadius: 18,
            backgroundColor: pin.color,
            zIndex: pin.hot || pin.hover ? 5 : 3,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {pin.count > 1 ? <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>{pin.count}</Text> : null}
        </Pressable>
      ))}
      <Attribution />
      <ZoomControls />
    </View>
  );

  if (Platform.OS !== 'web') return renderNative();

  return (
    <View
      onLayout={event => rememberWidth(event.nativeEvent.layout.width)}
      style={[{height, width: '100%', overflow: 'hidden', backgroundColor: '#eef1ef', borderRadius: 10, borderWidth: style?.borderWidth ? undefined : 1, borderColor: style?.borderColor ? undefined : '#E5E7EB'}, style]}
      {...(lockView ? {} : panResponder.panHandlers)}>
      {React.createElement(
        'div',
        {
          ref: host,
          'data-map-host': 'true',
          onWheel: (event: React.WheelEvent<HTMLDivElement>) => {
            if (lockView) return;
            event.preventDefault();
            zoomBy(event.deltaY > 0 ? -1 : 1);
          },
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            if (!onMapPress || !host.current) return;
            if (Math.abs(dragRef.current.x) > 6 || Math.abs(dragRef.current.y) > 6) return;
            const rect = host.current.getBoundingClientRect();
            onMapPress(unproject(
              viewX - width / 2 + (event.clientX - rect.left),
              viewY - height / 2 + (event.clientY - rect.top),
              level,
            ));
          },
          style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            cursor: lockView ? 'default' : onMapPress ? 'crosshair' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
          },
        },
        tiles.map(tile =>
          React.createElement(MapTile, {
            key: tile.key,
            src: tile.src,
            fallback: tile.fallback,
            left: tile.left,
            top: tile.top,
            filter: tileFilter(basemap),
          }),
        ),
        heat.map(spot =>
          React.createElement('div', {
            key: spot.id,
            style: {
              position: 'absolute',
              left: spot.left - 28,
              top: spot.top - 28,
              width: 56,
              height: 56,
              borderRadius: 28,
              background: spot.color,
              opacity: 0.18,
              filter: 'blur(10px)',
              pointerEvents: 'none',
              zIndex: 1,
            },
          }),
        ),
        spots.map(pin => {
          const size = pin.count > 1 ? 36 : pin.hot ? 22 : 16;
          const ring = pin.hot ? 3 : 2;
          return React.createElement(
            'button',
            {
              key: pin.id,
              type: 'button',
              title: pin.title,
              'aria-label': pin.title || 'Complaint pin',
              onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                openSpot(pin);
              },
              style: {
                position: 'absolute',
                left: pin.left,
                top: pin.top,
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                border: `${ring}px solid ${pin.hot ? '#111827' : '#FFFFFF'}`,
                borderRadius: 999,
                background: pin.count > 1 ? donutGradient(pin.colors) : pin.color,
                boxShadow: pin.hover || pin.hot ? '0 0 0 3px rgba(15,61,58,0.18)' : '0 1px 4px rgba(17,24,39,0.25)',
                padding: 0,
                cursor: 'pointer',
                zIndex: pin.hot || pin.hover ? 5 : 3,
                color: '#111827',
                fontWeight: 700,
                fontSize: 12,
                display: 'grid',
                placeItems: 'center',
              },
            },
            pin.count > 1
              ? React.createElement(
                  'span',
                  {
                    style: {
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: '#FFFFFF',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#111827',
                    },
                  },
                  String(pin.count),
                )
              : null,
            pin.pulse && pin.count === 1
              ? React.createElement('span', {className: 'swachh-pin-pulse'})
              : null,
          );
        }),
      )}
      <Attribution />
      <ZoomControls />
    </View>
  );
}

export function zoomMapHost(host: HTMLElement | null, direction: 'in' | 'out') {
  if (!host) return;
  const node = host as HTMLElement & {__zoomIn?: () => void; __zoomOut?: () => void};
  if (direction === 'in') node.__zoomIn?.();
  else node.__zoomOut?.();
}
