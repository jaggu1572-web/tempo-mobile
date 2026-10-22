import { useMemo, useRef } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { speedColors } from '@/lib/geo';
import type { Pt } from '@/lib/types';
import { useTheme } from './theme';

/** Full map for an activity, route coloured from slow (amber) to fast (accent). */
export function RouteMap({ pts, height = 320 }: { pts: Pt[]; height?: number }) {
  const t = useTheme();
  const ref = useRef<MapView>(null);
  const coords = useMemo(() => pts.map((p) => ({ latitude: p[0], longitude: p[1] })), [pts]);
  const colors = useMemo(() => speedColors(pts, t.slow, t.accent), [pts, t.slow, t.accent]);

  return (
    <MapView
      ref={ref}
      style={{ height, borderRadius: 14 }}
      userInterfaceStyle={t.scheme}
      pitchEnabled={false}
      toolbarEnabled={false}
      onMapReady={() => ref.current?.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false })}>
      <Polyline coordinates={coords} strokeWidth={8} strokeColor={t.surface} />
      <Polyline coordinates={coords} strokeWidth={4} strokeColor={t.accent} strokeColors={colors ?? undefined} />
      <Marker coordinate={coords[0]} pinColor={t.good} title="Start" />
      <Marker coordinate={coords[coords.length - 1]} pinColor={t.ink} title="Finish" />
    </MapView>
  );
}
