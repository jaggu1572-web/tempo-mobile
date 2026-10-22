import { cumDist, elevGain, haversine } from './geo';
import { autoTitle } from './format';
import type { Activity, ActivityType, Pt } from './types';

/** Deterministic PRNG so example routes look the same on every launch. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const PACE_S_PER_M: Record<ActivityType, number> = {
  run: (5.25 * 60) / 1000,
  ride: 3600 / 27000,
  walk: (11.5 * 60) / 1000,
  hike: (15 * 60) / 1000,
  swim: 120 / 100,
};

function makeRoute(r: () => number, type: ActivityType, targetM: number, pace: number): Pt[] {
  const lat0 = 47.6205 + (r() - 0.5) * 0.02;
  const lon0 = -122.3493 + (r() - 0.5) * 0.03;
  const loop = type !== 'ride' || r() > 0.5;
  const radius = loop ? targetM / (2 * Math.PI) : targetM / 2;
  const ph = [r() * 6, r() * 6, r() * 6];
  const n = Math.max(120, Math.round(targetM / 20));
  const raw: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    if (loop) {
      const th = s * Math.PI * 2;
      const rad = radius * (1 + 0.22 * Math.sin(3 * th + ph[0]) + 0.12 * Math.sin(5 * th + ph[1]));
      raw.push([rad * Math.cos(th) - radius, rad * Math.sin(th)]);
    } else {
      const u = s < 0.5 ? s * 2 : (1 - s) * 2;
      raw.push([u * radius * 2, Math.sin(u * 4 + ph[2]) * radius * 0.18 + (s < 0.5 ? 0 : 25)]);
    }
  }
  let len = 0;
  for (let i = 1; i < raw.length; i++) len += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]);
  const k = targetM / len;
  const mLat = 1 / 111320;
  const mLon = 1 / (111320 * Math.cos((lat0 * Math.PI) / 180));
  const base = 20 + r() * 40;
  const hills = type === 'hike' ? 140 : type === 'ride' ? 60 : 22;

  const pts: Pt[] = [];
  let t = 0;
  for (let i = 0; i < raw.length; i++) {
    const s = i / n;
    const shape = Math.sin(s * Math.PI * 3 + ph[0]) * 0.6 + Math.sin(s * Math.PI * 8 + ph[1]) * 0.25 + 0.85;
    const ele = base + hills * shape * (type === 'hike' ? Math.sin(s * Math.PI) * 1.4 : 1);
    const p: Pt = [lat0 + raw[i][1] * k * mLat, lon0 + raw[i][0] * k * mLon, Math.round(ele * 10) / 10, 0];
    const prev = pts[pts.length - 1];
    if (prev) {
      const d = haversine(prev, p);
      const grade = ((p[2] as number) - (prev[2] as number)) / (d || 1);
      t += d * pace * (1 + Math.max(-0.25, Math.min(0.8, grade * 6))) * (1 + s * 0.05) * (1 + (r() - 0.5) * 0.12);
    }
    p[3] = Math.round(t);
    pts.push(p);
  }
  return pts;
}

const PLAN: [number, number, ActivityType, number, string][] = [
  [0, 7, 'run', 8.2, 'Easy loop around the lake'],
  [1, 18, 'ride', 34, 'Tailwind out, headwind home'],
  [2, 6.5, 'run', 10.1, 'Tempo: 3 × 2k at threshold'],
  [4, 17.5, 'walk', 4.2, ''],
  [5, 8, 'run', 5.0, 'Parkrun'],
  [6, 9, 'hike', 11.5, 'Rattlesnake Ledge'],
  [8, 7, 'run', 7.4, ''],
  [9, 18, 'ride', 41, ''],
  [11, 6.5, 'run', 12.0, 'Long run, negative split'],
  [13, 8, 'run', 6.1, ''],
  [15, 7, 'run', 9.0, ''],
  [16, 18.5, 'ride', 28, ''],
  [19, 7, 'run', 14.3, 'Longest since spring'],
  [21, 8, 'run', 5.0, ''],
  [24, 7, 'run', 8.8, ''],
  [27, 9, 'hike', 9.4, ''],
  [30, 7, 'run', 10.0, ''],
  [33, 18, 'ride', 52, 'Club ride'],
  [37, 7, 'run', 6.5, ''],
  [41, 7, 'run', 11.2, ''],
  [45, 8, 'run', 7.0, ''],
  [52, 7, 'run', 9.6, ''],
  [60, 8, 'run', 12.5, ''],
  [67, 9, 'ride', 38, ''],
  [74, 7, 'run', 8.0, ''],
  [80, 7, 'run', 10.5, ''],
];

/** Sample activities shown until the user saves their own. Always flagged `example: true`. */
export function buildExamples(now = new Date()): Activity[] {
  const r = rng(20261022);
  return PLAN.map(([daysAgo, hour, type, km, title]) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(Math.floor(hour), (hour % 1) * 60 + Math.floor(r() * 20), 0, 0);
    if (d > now) d.setDate(d.getDate() - 1);
    const pts = makeRoute(r, type, km * 1000, PACE_S_PER_M[type] * (0.94 + r() * 0.1));
    return {
      id: `example-${daysAgo}-${type}`,
      example: true,
      type,
      title: title || autoTitle(type, d),
      notes: '',
      start: d.toISOString(),
      distance: cumDist(pts)[pts.length - 1],
      duration: pts[pts.length - 1][3] as number,
      elevGain: elevGain(pts),
      pts,
      source: 'gpx',
    };
  });
}
