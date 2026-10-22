import type { Pt } from './types';

const R = 6371000;
const toRad = Math.PI / 180;

/** Great-circle distance in metres. */
export function haversine(a: Pt | [number, number], b: Pt | [number, number]): number {
  const dLat = (b[0] - a[0]) * toRad;
  const dLon = (b[1] - a[1]) * toRad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function cumDist(pts: Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + haversine(pts[i - 1], pts[i]));
  return out;
}

/** Climb with a 2 m hysteresis so GPS altitude noise doesn't count as climbing. */
export function elevGain(pts: Pt[]): number {
  let gain = 0;
  let ref: number | null = null;
  for (const p of pts) {
    const e = p[2];
    if (e == null) continue;
    if (ref == null) ref = e;
    else if (e - ref > 2) {
      gain += e - ref;
      ref = e;
    } else if (ref - e > 2) ref = e;
  }
  return gain;
}

export function downsample<T>(pts: T[], max = 800): T[] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * step)]);
  return out;
}

const MOVING_SPEED = 0.4; // m/s; slower than this between fixes counts as stopped
const MAX_GAP = 60; // s; longer gaps between fixes count at most this much

/**
 * Rewrites each point's clock so it only advances while moving, and returns the
 * total moving time. Points must carry raw elapsed seconds in slot 3.
 */
export function retimeMoving(pts: Pt[]): { pts: Pt[]; moving: number } {
  if (!pts.length || pts.some((p) => p[3] == null)) return { pts, moving: 0 };
  let clock = 0;
  const out: Pt[] = [[pts[0][0], pts[0][1], pts[0][2], 0]];
  for (let i = 1; i < pts.length; i++) {
    const dt = (pts[i][3] as number) - (pts[i - 1][3] as number);
    const dd = haversine(pts[i - 1], pts[i]);
    if (dt > 0 && dd / dt > MOVING_SPEED) clock += Math.min(dt, MAX_GAP);
    out.push([pts[i][0], pts[i][1], pts[i][2], clock]);
  }
  return { pts: out, moving: clock };
}

export type Split = { distance: number; time: number; elev: number; partial: boolean };

/** Splits every `unit` metres, interpolating between fixes. */
export function splits(pts: Pt[] | null, unit: number): Split[] {
  if (!pts || pts.length < 2 || pts[0][3] == null) return [];
  const cd = cumDist(pts);
  const out: Split[] = [];
  let next = unit;
  let lastT = pts[0][3] as number;
  let lastE = pts[0][2] ?? 0;
  for (let i = 1; i < pts.length; i++) {
    while (cd[i] >= next) {
      const f = (next - cd[i - 1]) / (cd[i] - cd[i - 1] || 1);
      const t0 = pts[i - 1][3] as number;
      const t = t0 + f * ((pts[i][3] as number) - t0);
      const e0 = pts[i - 1][2] ?? 0;
      const e = e0 + f * ((pts[i][2] ?? 0) - e0);
      out.push({ distance: unit, time: t - lastT, elev: e - lastE, partial: false });
      lastT = t;
      lastE = e;
      next += unit;
    }
  }
  const last = pts[pts.length - 1];
  const rem = cd[cd.length - 1] - (next - unit);
  if (rem > unit * 0.1) out.push({ distance: rem, time: (last[3] as number) - lastT, elev: (last[2] ?? 0) - lastE, partial: true });
  return out;
}

/** Fastest time to cover `target` metres anywhere inside the route, or null. */
export function bestEffort(pts: Pt[] | null, target: number): number | null {
  if (!pts || pts.length < 2 || pts[0][3] == null) return null;
  const cd = cumDist(pts);
  if (cd[cd.length - 1] < target) return null;
  let j = 0;
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    while (j + 1 < i && cd[i] - cd[j + 1] >= target) j++;
    const span = cd[i] - cd[j];
    if (span >= target) best = Math.min(best, (((pts[i][3] as number) - (pts[j][3] as number)) * target) / span);
  }
  return Number.isFinite(best) ? best : null;
}

/** One colour per point, blending slow→fast by smoothed speed. */
export function speedColors(pts: Pt[], slow: string, fast: string): string[] | null {
  if (pts.length < 2 || pts[0][3] == null) return null;
  const sp: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dt = (pts[i][3] as number) - (pts[i - 1][3] as number);
    sp.push(dt > 0 ? haversine(pts[i - 1], pts[i]) / dt : 0);
  }
  const smooth = sp.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(1, i - 4); k <= Math.min(sp.length - 1, i + 4); k++) {
      s += sp[k];
      n++;
    }
    return n ? s / n : 0;
  });
  const sorted = smooth.filter((v) => v > 0).sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const hi = sorted[Math.floor(sorted.length * 0.95)] ?? 1;
  const A = hexToRgb(slow);
  const B = hexToRgb(fast);
  return smooth.map((v) => {
    const f = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
    return `rgb(${A.map((c, j) => Math.round(c + (B[j] - c) * f)).join(',')})`;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

export function bounds(pts: Pt[]) {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of pts) {
    minLat = Math.min(minLat, p[0]);
    maxLat = Math.max(maxLat, p[0]);
    minLon = Math.min(minLon, p[1]);
    maxLon = Math.max(maxLon, p[1]);
  }
  return { minLat, maxLat, minLon, maxLon };
}
