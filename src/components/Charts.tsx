import { useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { cumDist, downsample } from '@/lib/geo';
import { elevLabel, fmtElev, unitMetres } from '@/lib/format';
import type { WeekBucket } from '@/lib/stats';
import type { Pt, Units } from '@/lib/types';
import { useTheme } from './theme';

const font = Platform.select({ web: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', default: undefined });

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)] as const;
}

function niceStep(x: number) {
  const p = 10 ** Math.floor(Math.log10(x || 1));
  const f = x / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

export function ElevationChart({ pts, units, height = 150 }: { pts: Pt[]; units: Units; height?: number }) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const small = downsample(pts, 300);
  const cd = cumDist(small);
  const es = small.map((p) => p[2] ?? 0);
  const mn = Math.min(...es);
  const mx = Math.max(...es);
  const span = Math.max(mx - mn, 10);
  const lo = mn - span * 0.1;
  const hi = mx + span * 0.1;
  const total = cd[cd.length - 1] || 1;
  const L = 40, B = 20, T = 14, Rt = 8;
  const X = (d: number) => L + (d / total) * (w - L - Rt);
  const Y = (e: number) => T + (1 - (e - lo) / (hi - lo)) * (height - T - B);
  const line = small.map((_, i) => `${X(cd[i]).toFixed(1)},${Y(es[i]).toFixed(1)}`).join(' ');
  const unit = unitMetres(units);
  const step = Math.max(1, Math.ceil(total / unit / 5));
  const xticks: number[] = [];
  for (let k = 0; k * unit <= total; k += step) xticks.push(k);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[lo + (hi - lo) * 0.15, lo + (hi - lo) * 0.85].map((e) => (
            <SvgText fontFamily={font} key={e} x={L - 6} y={Y(e) + 4} fontSize={11} fill={t.muted} textAnchor="end">
              {fmtElev(e, units)}
            </SvgText>
          ))}
          <SvgText fontFamily={font} x={L - 6} y={10} fontSize={11} fill={t.muted} textAnchor="end">
            {elevLabel(units)}
          </SvgText>
          <Polygon points={`${L},${height - B} ${line} ${w - Rt},${height - B}`} fill={t.accentSoft} />
          <Polyline points={line} fill="none" stroke={t.accent} strokeWidth={2} strokeLinejoin="round" />
          <Line x1={L} x2={w - Rt} y1={height - B} y2={height - B} stroke={t.line} />
          {xticks.map((k) => (
            <SvgText fontFamily={font} key={k} x={X(k * unit)} y={height - 5} fontSize={11} fill={t.muted} textAnchor="middle">
              {String(k)}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

export function WeekBars({ weeks, goalM, units, height = 200 }: { weeks: WeekBucket[]; goalM: number; units: Units; height?: number }) {
  const t = useTheme();
  const [w, onLayout] = useWidth();
  const u = unitMetres(units);
  const maxV = Math.max(goalM * 1.15, ...weeks.map((x) => x.distance)) / u;
  const step = niceStep(maxV / 4);
  const top = Math.ceil(maxV / step) * step;
  const L = 34, B = 22, T = 14;
  const Y = (v: number) => T + (1 - v / top) * (height - T - B);
  const bw = (w - L) / weeks.length;
  const grid: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) grid.push(+v.toFixed(2));
  const gy = Y(goalM / u);

  return (
    <View onLayout={onLayout} style={{ height }} accessibilityLabel="Distance per week for the last 12 weeks">
      {w > 0 && (
        <Svg width={w} height={height}>
          {grid.map((v) => (
            <Line key={`g${v}`} x1={L} x2={w} y1={Y(v)} y2={Y(v)} stroke={t.line} />
          ))}
          {grid.map((v) => (
            <SvgText fontFamily={font} key={`l${v}`} x={L - 6} y={Y(v) + 4} fontSize={11} fill={t.muted} textAnchor="end">
              {String(v)}
            </SvgText>
          ))}
          {weeks.map((wk, i) => {
            const v = wk.distance / u;
            const current = i === weeks.length - 1;
            const x = L + i * bw + bw * 0.18;
            return (
              <Rect key={wk.start.toISOString()} x={x} y={Y(v)} width={bw * 0.64} height={Math.max(0, Y(0) - Y(v))} rx={3} fill={t.accent} opacity={current ? 1 : 0.55} />
            );
          })}
          {weeks.map((wk, i) =>
            i % 3 === 2 || i === weeks.length - 1 ? (
              <SvgText fontFamily={font} key={`d${i}`} x={L + i * bw + bw / 2} y={height - 6} fontSize={10} fill={t.muted} textAnchor="middle">
                {i === weeks.length - 1 ? 'Now' : wk.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </SvgText>
            ) : null,
          )}
          <Line x1={L} x2={w} y1={gy} y2={gy} stroke={t.slow} strokeWidth={2} strokeDasharray="6 4" />
          <SvgText fontFamily={font} x={w - 2} y={gy - 5} fontSize={11} fill={t.slow} fontWeight="700" textAnchor="end">
            goal
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
