import type { ActivityType, Pt } from './types';

/**
 * The activity waiting on the save screen. Routes are too big for router
 * params, so the recorder and GPX import park it here before navigating.
 */
export type Draft = {
  type: ActivityType;
  title: string;
  start: Date;
  distance: number | null;
  duration: number | null;
  elevGain: number | null;
  pts: Pt[] | null;
  source: 'gps' | 'gpx' | 'manual';
};

let draft: Draft | null = null;

export const setDraft = (d: Draft | null) => {
  draft = d;
};
export const takeDraft = (): Draft | null => draft;
