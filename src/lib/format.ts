import { ACTIVITY_TYPES, type ActivityType, type Units } from './types';

export const MILE = 1609.344;
export const FEET = 3.28084;

export const unitMetres = (u: Units) => (u === 'km' ? 1000 : MILE);
export const unitLabel = (u: Units) => u;
export const elevLabel = (u: Units) => (u === 'km' ? 'm' : 'ft');

export function fmtDist(m: number, u: Units, dp = 2): string {
  return (m / unitMetres(u)).toFixed(dp);
}

export function fmtElev(m: number, u: Units): string {
  return String(Math.round(u === 'km' ? m : m * FEET));
}

/** 3725 → "1:02:05", 312 → "5:12" */
export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** Always h:mm:ss, for the record clock. */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export type PaceParts = { value: string; unit: string; label: 'Pace' | 'Speed' };

/** Pace for foot sports, speed for rides, per-100 m for swims. */
export function pace(type: ActivityType, metres: number, sec: number, u: Units): PaceParts {
  const label = type === 'ride' ? 'Speed' : 'Pace';
  if (!metres || !sec) return { value: '–', unit: '', label };
  if (type === 'ride') return { value: (metres / unitMetres(u) / (sec / 3600)).toFixed(1), unit: u === 'km' ? 'km/h' : 'mph', label };
  if (type === 'swim') return { value: fmtDur(sec / (metres / 100)), unit: '/100m', label };
  return { value: fmtDur(sec / (metres / unitMetres(u))), unit: `/${u}`, label };
}

export function autoTitle(type: ActivityType, date: Date): string {
  const h = date.getHours();
  const part = h < 5 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night';
  return `${part} ${ACTIVITY_TYPES[type]}`;
}

/** "42:30" → 2550, "1:02:05" → 3725, "45" → 2700 (a bare number is minutes). NaN if invalid. */
export function parseDur(str: string): number {
  const parts = str.trim().split(':');
  if (!str.trim() || parts.length > 3) return NaN;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return NaN;
  if (nums.length === 1) return nums[0] * 60;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

export function fmtWhen(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day =
    d.toDateString() === now.toDateString()
      ? 'Today'
      : d.toDateString() === yesterday.toDateString()
        ? 'Yesterday'
        : d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
          });
  return `${day} at ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}
