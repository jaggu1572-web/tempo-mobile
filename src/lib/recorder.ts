import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { setDraft, type Draft } from './draft';
import { downsample, elevGain, haversine, retimeMoving } from './geo';
import { autoTitle } from './format';
import type { ActivityType, Pt } from './types';

/**
 * Live GPS recording. Prefers background location updates (keeps recording
 * with the screen locked, needs "Always" permission and a development build);
 * falls back to a foreground watcher, which works in Expo Go.
 */

export const LOCATION_TASK = 'tempo-record-location';
const KEY = 'tempo:recording:v1';
const MAX_ACCURACY_M = 35; // ignore fixes worse than this
const MIN_STEP_M = 3; // ignore jitter while standing still

export type RecorderStatus = 'idle' | 'recording' | 'paused';
export type RecorderError = 'permission' | 'services' | null;

type State = {
  status: RecorderStatus;
  type: ActivityType;
  startedAt: string | null;
  /** active (unpaused) milliseconds banked before the current stretch */
  activeMs: number;
  /** wall-clock ms when the current stretch began; null while paused/idle */
  resumedAt: number | null;
  pts: Pt[];
  distance: number;
  /** the next fix starts a new segment: don't count distance from the last point */
  breakNext: boolean;
  mode: 'background' | 'foreground' | null;
  error: RecorderError;
};

const initial: State = {
  status: 'idle',
  type: 'run',
  startedAt: null,
  activeMs: 0,
  resumedAt: null,
  pts: [],
  distance: 0,
  breakNext: false,
  mode: null,
  error: null,
};

let state: State = initial;
const listeners = new Set<() => void>();
let watcher: Location.LocationSubscription | null = null;
let lastPersist = 0;

function set(patch: Partial<State>, persistNow = false) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if (persistNow || Date.now() - lastPersist > 15000) persist();
}

function persist() {
  lastPersist = Date.now();
  const { mode: _mode, error: _error, ...rest } = state;
  AsyncStorage.setItem(KEY, JSON.stringify(rest)).catch(() => {});
}

export function activeSeconds(at = Date.now()): number {
  return (state.activeMs + (state.resumedAt != null ? at - state.resumedAt : 0)) / 1000;
}

function onLocations(locs: Location.LocationObject[]) {
  if (state.status !== 'recording' || state.resumedAt == null) return;
  let { pts, distance, breakNext } = state;
  let changed = false;
  for (const loc of locs) {
    const { latitude, longitude, altitude, accuracy } = loc.coords;
    if (accuracy != null && accuracy > MAX_ACCURACY_M) continue;
    if (loc.timestamp < state.resumedAt) continue;
    const p: Pt = [+latitude.toFixed(6), +longitude.toFixed(6), altitude != null ? Math.round(altitude * 10) / 10 : null, Math.round(activeSeconds(loc.timestamp))];
    const last = pts[pts.length - 1];
    if (last) {
      const d = haversine(last, p);
      if (d < MIN_STEP_M && !breakNext) continue;
      if (!breakNext) distance += d;
    }
    pts = [...pts, p];
    breakNext = false;
    changed = true;
  }
  if (changed) set({ pts, distance, breakNext });
}

// Must be defined at module scope so the OS can wake the JS bundle with fixes.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    onLocations(data.locations);
  });
}

async function startTracking(): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) {
    set({ error: 'permission' });
    return false;
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    set({ error: 'services' });
    return false;
  }
  if (Platform.OS !== 'web') {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.granted) {
        if (!(await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK))) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 2000,
            activityType: Location.ActivityType.Fitness,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'Tempo is recording',
              notificationBody: 'Tracking your route, distance and pace.',
              killServiceOnDestroy: false,
            },
          });
        }
        set({ mode: 'background', error: null });
        return true;
      }
    } catch {
      // Expo Go can't run background location; fall through to the foreground watcher.
    }
  }
  watcher?.remove();
  watcher = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 },
    (loc) => onLocations([loc]),
  );
  set({ mode: 'foreground', error: null });
  return true;
}

async function stopTracking() {
  watcher?.remove();
  watcher = null;
  if (Platform.OS === 'web') return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {}
}

export const recorder = {
  setType(type: ActivityType) {
    set({ type });
  },

  async start() {
    if (state.status !== 'idle') return;
    if (!(await startTracking())) return;
    set({ ...initial, type: state.type, mode: state.mode, status: 'recording', startedAt: new Date().toISOString(), resumedAt: Date.now() }, true);
  },

  pause() {
    if (state.status !== 'recording') return;
    set({ status: 'paused', activeMs: activeSeconds() * 1000, resumedAt: null, breakNext: true }, true);
  },

  async resume() {
    if (state.status !== 'paused') return;
    if (!state.mode && !(await startTracking())) return;
    set({ status: 'recording', resumedAt: Date.now() }, true);
  },

  /** Stops recording and parks the result as a draft for the save screen. */
  async finish(): Promise<Draft> {
    const active = activeSeconds();
    await stopTracking();
    const start = state.startedAt ? new Date(state.startedAt) : new Date();
    const hasRoute = state.pts.length > 1;
    const { moving } = hasRoute ? retimeMoving(state.pts) : { moving: 0 };
    const draft: Draft = {
      type: state.type,
      title: autoTitle(state.type, start),
      start,
      distance: state.distance,
      // Moving time once there's enough route to judge stops; otherwise the stopwatch.
      duration: state.pts.length > 10 && moving > 0 ? moving : active,
      elevGain: hasRoute ? elevGain(state.pts) : 0,
      pts: hasRoute ? downsample(state.pts) : null,
      source: 'gps',
    };
    setDraft(draft);
    set({ ...initial, type: state.type }, true);
    return draft;
  },

  async discard() {
    await stopTracking();
    set({ ...initial, type: state.type }, true);
  },

  /** Restores a recording that was running when the app was closed. */
  async restore() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Omit<State, 'mode' | 'error'>;
      if (saved.status === 'idle') {
        set({ type: saved.type });
        return;
      }
      state = { ...initial, ...saved };
      if (saved.status === 'recording') await startTracking();
      listeners.forEach((l) => l());
    } catch {}
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRecorder() {
  return useSyncExternalStore(subscribe, () => state);
}

/** Pace over roughly the last 30 s of moving, in seconds per metre, or null. */
export function currentPace(pts: Pt[]): number | null {
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  let i = pts.length - 2;
  let d = 0;
  while (i >= 0 && (last[3] as number) - (pts[i][3] as number) < 30) {
    d += haversine(pts[i], pts[i + 1]);
    i--;
  }
  if (i >= 0) d += haversine(pts[i], pts[i + 1]);
  const dt = (last[3] as number) - (pts[Math.max(i, 0)][3] as number);
  return d > 10 && dt > 0 ? dt / d : null;
}
