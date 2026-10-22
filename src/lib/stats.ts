import { bestEffort } from './geo';
import { MILE } from './format';
import type { Activity, ActivityType } from './types';

/** Monday 00:00 of the week containing `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export type WeekBucket = { start: Date; distance: number; duration: number; count: number };

export function weeklyTotals(list: Activity[], weeks = 12, now = new Date()): WeekBucket[] {
  const first = weekStart(now);
  const out: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(first);
    s.setDate(s.getDate() - i * 7);
    out.push({ start: s, distance: 0, duration: 0, count: 0 });
  }
  for (const a of list) {
    const ws = weekStart(new Date(a.start)).getTime();
    const b = out.find((w) => w.start.getTime() === ws);
    if (b) {
      b.distance += a.distance;
      b.duration += a.duration;
      b.count++;
    }
  }
  return out;
}

/** Distance per weekday (Mon..Sun) for the current week. */
export function thisWeekByDay(list: Activity[], now = new Date()): number[] {
  const ws = weekStart(now);
  const days = Array(7).fill(0);
  for (const a of list) {
    const d = new Date(a.start);
    if (d >= ws && d <= now) days[(d.getDay() + 6) % 7] += a.distance;
  }
  return days;
}

/** Consecutive weeks with at least one activity, counting back from this week (or last, if this week is empty so far). */
export function weekStreak(list: Activity[], now = new Date()): number {
  const weeks = new Set(list.map((a) => weekStart(new Date(a.start)).getTime()));
  const w = weekStart(now);
  if (!weeks.has(w.getTime())) w.setDate(w.getDate() - 7);
  let n = 0;
  while (weeks.has(w.getTime())) {
    n++;
    w.setDate(w.getDate() - 7);
  }
  return n;
}

export const EFFORTS: Partial<Record<ActivityType, [number, string][]>> = {
  run: [[1000, '1 km'], [MILE, '1 mile'], [5000, '5 km'], [10000, '10 km'], [21097.5, 'Half marathon'], [42195, 'Marathon']],
  walk: [[1000, '1 km'], [5000, '5 km']],
  hike: [[1000, '1 km'], [5000, '5 km']],
  ride: [[10000, '10 km'], [20000, '20 km'], [40000, '40 km'], [100000, '100 km']],
};

export type Record_ = { label: string; seconds: number; activity: Activity };

export function bestEfforts(list: Activity[], type: ActivityType): Record_[] {
  const out: Record_[] = [];
  for (const [d, label] of EFFORTS[type] ?? []) {
    let best: Record_ | null = null;
    for (const a of list) {
      if (a.type !== type) continue;
      const t = bestEffort(a.pts, d);
      if (t != null && (!best || t < best.seconds)) best = { label, seconds: t, activity: a };
    }
    if (best) out.push(best);
  }
  return out;
}
