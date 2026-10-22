import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { buildExamples } from './examples';
import type { Activity, Units } from './types';

type Settings = { units: Units; weeklyGoalKm: number; hideExamples: boolean };
type State = { loaded: boolean; activities: Activity[]; settings: Settings };

const KEY_ACTIVITIES = 'tempo:activities:v1';
const KEY_SETTINGS = 'tempo:settings:v1';

let state: State = {
  loaded: false,
  activities: [],
  settings: { units: 'km', weeklyGoalKm: 30, hideExamples: false },
};
const listeners = new Set<() => void>();
const examples = buildExamples();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export async function loadStore() {
  try {
    const [a, s] = await AsyncStorage.multiGet([KEY_ACTIVITIES, KEY_SETTINGS]);
    set({
      loaded: true,
      activities: a[1] ? (JSON.parse(a[1]) as Activity[]) : [],
      settings: s[1] ? { ...state.settings, ...JSON.parse(s[1]) } : state.settings,
    });
  } catch {
    set({ loaded: true });
  }
}

const sortNewest = (list: Activity[]) => [...list].sort((x, y) => y.start.localeCompare(x.start));

export async function saveActivity(a: Activity) {
  const activities = sortNewest([a, ...state.activities.filter((x) => x.id !== a.id)]);
  set({ activities });
  await AsyncStorage.setItem(KEY_ACTIVITIES, JSON.stringify(activities));
}

export async function deleteActivity(id: string) {
  const activities = state.activities.filter((x) => x.id !== id);
  set({ activities });
  await AsyncStorage.setItem(KEY_ACTIVITIES, JSON.stringify(activities));
}

export async function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  set({ settings });
  await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

export function useStore() {
  const s = useSyncExternalStore(subscribe, () => state);
  const showingExamples = s.loaded && !s.activities.length && !s.settings.hideExamples;
  return {
    ...s,
    showingExamples,
    /** What the feed and charts show: your activities, or the examples until you have some. */
    visible: showingExamples ? examples : s.activities,
  };
}

export function findActivity(id: string): Activity | undefined {
  return state.activities.find((a) => a.id === id) ?? examples.find((a) => a.id === id);
}

export const newId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
