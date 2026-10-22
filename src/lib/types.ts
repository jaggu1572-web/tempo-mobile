export type ActivityType = 'run' | 'ride' | 'walk' | 'hike' | 'swim';

export const ACTIVITY_TYPES: Record<ActivityType, string> = {
  run: 'Run',
  ride: 'Ride',
  walk: 'Walk',
  hike: 'Hike',
  swim: 'Swim',
};

/** [latitude, longitude, elevation m | null, seconds of moving time | null] */
export type Pt = [number, number, number | null, number | null];

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  notes: string;
  /** ISO timestamp of the start */
  start: string;
  /** metres */
  distance: number;
  /** moving time, seconds */
  duration: number;
  /** metres */
  elevGain: number;
  pts: Pt[] | null;
  source: 'gps' | 'gpx' | 'manual';
  example?: boolean;
};

export type Units = 'km' | 'mi';
