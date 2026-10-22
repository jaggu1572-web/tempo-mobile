import { useMemo } from 'react';
import MapView, { Polyline } from 'react-native-maps';

import type { Pt } from '@/lib/types';
import { useTheme } from './theme';

/** Map that follows you while recording and draws the route so far. */
export function LiveMap({ pts, height }: { pts: Pt[]; height: number }) {
  const t = useTheme();
  const coords = useMemo(() => pts.map((p) => ({ latitude: p[0], longitude: p[1] })), [pts]);
  return (
    <MapView
      style={{ height, borderRadius: 14 }}
      userInterfaceStyle={t.scheme}
      showsUserLocation
      followsUserLocation
      showsMyLocationButton
      pitchEnabled={false}
      toolbarEnabled={false}>
      {coords.length > 1 && <Polyline coordinates={coords} strokeWidth={5} strokeColor={t.accent} />}
    </MapView>
  );
}
