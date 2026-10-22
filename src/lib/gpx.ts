import { cumDist, downsample, elevGain, retimeMoving } from './geo';
import type { ActivityType, Pt } from './types';

export type ParsedGpx = {
  pts: Pt[];
  distance: number;
  /** moving seconds, or null when the file has no timestamps */
  duration: number | null;
  elevGain: number;
  start: Date | null;
  title: string;
  type: ActivityType;
};

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`));
  return m ? parseFloat(m[1]) : NaN;
};
const inner = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`));
  return m ? m[1].trim() : null;
};
const unescapeXml = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/**
 * Minimal GPX reader (no DOMParser on React Native). Reads track points, or
 * route points when there is no track, and works out distance, moving time,
 * climb and a likely activity type.
 */
export function parseGpx(xml: string): ParsedGpx {
  if (!/<gpx[\s>]/i.test(xml)) throw new Error("That file isn't GPX. Export the activity as a .gpx file and try again.");
  const re = (name: string) => new RegExp(`<${name}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${name}>)`, 'g');
  let matches = [...xml.matchAll(re('trkpt'))];
  if (matches.length < 2) matches = [...xml.matchAll(re('rtept'))];
  if (matches.length < 2) throw new Error('No track points found. Export the activity as GPX with its recorded track.');

  const raw = matches
    .map((m) => {
      const body = m[2] ?? '';
      const ele = inner(body, 'ele');
      const time = inner(body, 'time');
      return { lat: attr(m[1], 'lat'), lon: attr(m[1], 'lon'), ele: ele != null ? parseFloat(ele) : null, time: time ? Date.parse(time) : NaN };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  const hasTime = raw.every((p) => Number.isFinite(p.time));
  const t0 = hasTime ? raw[0].time : NaN;
  const pts: Pt[] = raw.map((p) => [
    +p.lat.toFixed(6),
    +p.lon.toFixed(6),
    p.ele != null && Number.isFinite(p.ele) ? Math.round(p.ele * 10) / 10 : null,
    hasTime ? Math.round((p.time - t0) / 1000) : null,
  ]);

  const cd = cumDist(pts);
  const distance = cd[cd.length - 1];
  const { pts: timed, moving } = hasTime ? retimeMoving(pts) : { pts, moving: 0 };

  const trk = inner(xml, 'trk') ?? xml;
  const title = unescapeXml(inner(trk, 'name') ?? inner(xml, 'name') ?? '');
  const typeTag = (inner(trk, 'type') ?? '').toLowerCase();
  const avg = hasTime && moving ? distance / moving : 0;
  const type: ActivityType = /ride|bik|cycl/.test(typeTag)
    ? 'ride'
    : /hik/.test(typeTag)
      ? 'hike'
      : /walk/.test(typeTag)
        ? 'walk'
        : /swim/.test(typeTag)
          ? 'swim'
          : /run/.test(typeTag)
            ? 'run'
            : avg > 4.6
              ? 'ride'
              : avg && avg < 1.7
                ? 'walk'
                : 'run';

  return {
    pts: downsample(timed),
    distance,
    duration: hasTime ? moving : null,
    elevGain: elevGain(pts),
    start: hasTime ? new Date(t0) : null,
    title,
    type,
  };
}
