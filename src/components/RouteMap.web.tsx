import { View } from 'react-native';

import type { Pt } from '@/lib/types';
import { RouteThumb } from './RouteThumb';

/** react-native-maps has no web build; show the drawn route instead. */
export function RouteMap({ pts, height = 320 }: { pts: Pt[]; height?: number }) {
  return (
    <View style={{ borderRadius: 14, overflow: 'hidden' }}>
      <RouteThumb pts={pts} height={height} />
    </View>
  );
}
