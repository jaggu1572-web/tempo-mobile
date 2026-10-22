/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildExamples } from '../examples';
import { fmtClock, fmtDur, pace, parseDur } from '../format';
import { bestEffort, cumDist, elevGain, haversine, retimeMoving, splits } from '../geo';
import { parseGpx } from '../gpx';
import { weekStart, weekStreak, weeklyTotals } from '../stats';
import type { Activity, Pt } from '../types';

/** A straight line north from Seattle, one fix every `stepM` metres at `speed` m/s. */
function line(n: number, stepM: number, speed: number, ele = (i: number) => 50): Pt[] {
  const dLat = stepM / 111195;
  return Array.from({ length: n }, (_, i) => [47.6 + i * dLat, -122.3, ele(i), Math.round((i * stepM) / speed)] as Pt);
}

test('haversine: one degree of latitude ≈ 111 km', () => {
  assert.ok(Math.abs(haversine([0, 0, null, null], [1, 0, null, null]) - 111195) < 50);
});

test('duration parsing and formatting round-trip', () => {
  assert.equal(parseDur('42:30'), 2550);
  assert.equal(parseDur('1:02:05'), 3725);
  assert.equal(parseDur('45'), 2700);
  assert.ok(Number.isNaN(parseDur('abc')));
  assert.ok(Number.isNaN(parseDur('')));
  assert.equal(fmtDur(3725), '1:02:05');
  assert.equal(fmtDur(312), '5:12');
  assert.equal(fmtClock(59), '0:00:59');
});

test('pace for runs, speed for rides', () => {
  assert.deepEqual(pace('run', 5000, 1500, 'km'), { value: '5:00', unit: '/km', label: 'Pace' });
  assert.equal(pace('ride', 30000, 3600, 'km').value, '30.0');
  assert.equal(pace('run', 0, 100, 'km').value, '–');
});

test('splits: 3.5 km at 4 m/s gives three full 250 s splits and a partial', () => {
  const pts = line(351, 10, 4);
  const s = splits(pts, 1000);
  assert.equal(s.length, 4);
  for (const x of s.slice(0, 3)) assert.ok(Math.abs(x.time - 250) <= 1.5, `split ${x.time}`);
  assert.equal(s[3].partial, true);
});

test('best effort finds the fast stretch inside a slow run', () => {
  // 2 km at 2.5 m/s, then 1 km at 5 m/s, then 1 km at 2.5 m/s.
  const pts: Pt[] = [];
  let t = 0;
  for (let i = 0; i <= 400; i++) {
    if (i) t += 10 / (i > 200 && i <= 300 ? 5 : 2.5);
    pts.push([47.6 + (i * 10) / 111195, -122.3, 50, t]);
  }
  const best = bestEffort(pts, 1000)!;
  assert.ok(Math.abs(best - 200) < 3, `best ${best}`);
  assert.equal(bestEffort(pts, 10000), null);
});

test('elevation gain ignores sub-2 m noise', () => {
  const noisy = line(100, 10, 3, (i) => 50 + (i % 2) * 1.5);
  assert.equal(elevGain(noisy), 0);
  const climb = line(100, 10, 3, (i) => 50 + i);
  assert.ok(Math.abs(elevGain(climb) - 99) < 3);
});

test('moving time skips a long stop', () => {
  const a = line(50, 10, 2.5);
  const stopAt = a[a.length - 1];
  const b = line(50, 10, 2.5).map((p, i) => [p[0] + 50 * 10 / 111195, p[1], p[2], (p[3] as number) + (stopAt[3] as number) + 300] as Pt);
  const { moving } = retimeMoving([...a, ...b]);
  const elapsed = (b[b.length - 1][3] as number);
  assert.ok(elapsed - moving > 230, `elapsed ${elapsed}, moving ${moving}`);
});

test('GPX: reads track, time, elevation, name and type', () => {
  const trkpts = line(201, 10, 3).map((p, i) =>
    `<trkpt lat="${p[0]}" lon="${p[1]}"><ele>${50 + i * 0.5}</ele><time>${new Date(Date.UTC(2026, 9, 1, 7, 0, p[3] as number)).toISOString()}</time></trkpt>`).join('\n');
  const xml = `<?xml version="1.0"?><gpx version="1.1" creator="test"><metadata><name>File</name></metadata>
    <trk><name>Sunrise &amp; Hills</name><type>running</type><trkseg>${trkpts}</trkseg></trk></gpx>`;
  const g = parseGpx(xml);
  assert.equal(g.title, 'Sunrise & Hills');
  assert.equal(g.type, 'run');
  assert.ok(Math.abs(g.distance - 2000) < 5, `distance ${g.distance}`);
  assert.ok(Math.abs((g.duration ?? 0) - 667) < 5, `duration ${g.duration}`);
  assert.ok(g.elevGain > 95 && g.elevGain < 101, `gain ${g.elevGain}`);
  assert.equal(g.start?.toISOString(), '2026-10-01T07:00:00.000Z');
});

test('GPX: lon-before-lat, self-closing points, no timestamps, guesses ride from speed', () => {
  const pts = line(20, 100, 8).map((p) => `<rtept lon="${p[1]}" lat="${p[0]}"/>`).join('');
  const g = parseGpx(`<gpx><rte>${pts}</rte></gpx>`);
  assert.equal(g.duration, null);
  assert.ok(Math.abs(g.distance - 1900) < 5);
  const timed = line(50, 100, 8).map((p) => `<trkpt lat="${p[0]}" lon="${p[1]}"><time>${new Date(Date.UTC(2026, 0, 1, 0, 0, p[3] as number)).toISOString()}</time></trkpt>`).join('');
  assert.equal(parseGpx(`<gpx><trk><trkseg>${timed}</trkseg></trk></gpx>`).type, 'ride');
});

test('GPX: rejects files that are not GPX or have no points', () => {
  assert.throws(() => parseGpx('<html></html>'), /isn't GPX/);
  assert.throws(() => parseGpx('<gpx><trk></trk></gpx>'), /No track points/);
});

test('weeks: buckets, Monday start and streak', () => {
  const now = new Date('2026-10-22T12:00:00'); // Thursday
  assert.equal(weekStart(now).getDay(), 1);
  const mk = (iso: string, km: number): Activity => ({ id: iso, type: 'run', title: '', notes: '', start: new Date(iso).toISOString(), distance: km * 1000, duration: 1, elevGain: 0, pts: null, source: 'manual' });
  const list = [mk('2026-10-20T07:00', 5), mk('2026-10-14T07:00', 8), mk('2026-10-06T07:00', 3), mk('2026-09-20T07:00', 9)];
  const w = weeklyTotals(list, 4, now);
  assert.deepEqual(w.map((b) => b.distance / 1000), [0, 3, 8, 5]);
  assert.equal(weekStreak(list, now), 3);
});

test('examples are flagged and internally consistent', () => {
  const ex = buildExamples(new Date('2026-10-22T12:00:00'));
  assert.ok(ex.length > 20);
  for (const a of ex) {
    assert.equal(a.example, true);
    assert.ok(Math.abs(cumDist(a.pts!).at(-1)! - a.distance) < 1);
    assert.ok(new Date(a.start) <= new Date('2026-10-22T12:00:00'));
  }
});
