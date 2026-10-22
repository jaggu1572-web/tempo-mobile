import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { bounds, downsample } from '@/lib/geo';
import type { Pt } from '@/lib/types';
import { useTheme } from './theme';

/** Lightweight route drawing for lists — no map tiles, so a long feed stays fast. */
export function RouteThumb({ pts, height = 170 }: { pts: Pt[]; height?: number }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const path = useMemo(() => {
    if (!w || pts.length < 2) return null;
    const small = downsample(pts, 250);
    const b = bounds(small);
    const cos = Math.cos((small[0][0] * Math.PI) / 180);
    const spanX = (b.maxLon - b.minLon) * cos || 1e-9;
    const spanY = b.maxLat - b.minLat || 1e-9;
    const pad = 20;
    const sc = Math.min((w - pad * 2) / spanX, (height - pad * 2) / spanY);
    const ox = (w - spanX * sc) / 2;
    const oy = (height - spanY * sc) / 2;
    const xy = small.map((p) => [ox + (p[1] - b.minLon) * cos * sc, oy + (b.maxLat - p[0]) * sc]);
    return { points: xy.map((p) => p.join(',')).join(' '), start: xy[0], end: xy[xy.length - 1] };
  }, [pts, w, height]);

  const grid = [];
  for (let x = 24; x < w; x += 24) grid.push(<Line key={`x${x}`} x1={x} x2={x} y1={0} y2={height} stroke={t.accent} strokeOpacity={0.07} />);
  for (let y = 24; y < height; y += 24) grid.push(<Line key={`y${y}`} x1={0} x2={w} y1={y} y2={y} stroke={t.accent} strokeOpacity={0.07} />);

  return (
    <View onLayout={onLayout} style={{ height, backgroundColor: t.sunk }}>
      {path && (
        <Svg width={w} height={height}>
          {grid}
          <Polyline points={path.points} fill="none" stroke={t.surface} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" />
          <Polyline points={path.points} fill="none" stroke={t.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={path.end[0]} cy={path.end[1]} r={5} fill={t.ink} stroke={t.surface} strokeWidth={1.5} />
          <Circle cx={path.start[0]} cy={path.start[1]} r={5} fill={t.good} stroke={t.surface} strokeWidth={1.5} />
        </Svg>
      )}
    </View>
  );
}
