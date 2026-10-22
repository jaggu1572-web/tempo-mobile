import { Text, View } from 'react-native';

import type { Pt } from '@/lib/types';
import { RouteThumb } from './RouteThumb';
import { useTheme } from './theme';

export function LiveMap({ pts, height }: { pts: Pt[]; height: number }) {
  const t = useTheme();
  if (pts.length > 1)
    return (
      <View style={{ borderRadius: 14, overflow: 'hidden' }}>
        <RouteThumb pts={pts} height={height} />
      </View>
    );
  return (
    <View style={{ height, borderRadius: 14, backgroundColor: t.sunk, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text style={{ color: t.muted, textAlign: 'center' }}>Your route draws here as you move.</Text>
    </View>
  );
}
