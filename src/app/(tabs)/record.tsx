import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';

import { LiveMap } from '@/components/LiveMap';
import { numeric, useTheme } from '@/components/theme';
import { Button, Card, SectionTitle, Stat, TypePicker } from '@/components/ui';
import { setDraft } from '@/lib/draft';
import { fmtClock, fmtDist, pace } from '@/lib/format';
import { parseGpx } from '@/lib/gpx';
import { activeSeconds, currentPace, recorder, useRecorder } from '@/lib/recorder';
import { useStore } from '@/lib/store';
import type { ActivityType } from '@/lib/types';

export default function Record() {
  const t = useTheme();
  const rec = useRecorder();
  const { settings } = useStore();
  const units = settings.units;
  const [, tick] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  // Re-render once a second while the clock runs.
  useEffect(() => {
    if (rec.status !== 'recording') return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [rec.status]);

  // Without background updates the app must stay on screen, so keep it awake.
  useEffect(() => {
    if (rec.status === 'recording' && rec.mode === 'foreground') {
      activateKeepAwakeAsync('record').catch(() => {});
      return () => {
        deactivateKeepAwake('record').catch(() => {});
      };
    }
  }, [rec.status, rec.mode]);

  const elapsed = activeSeconds();
  const avg = pace(rec.type, rec.distance, elapsed, units);
  const cur = currentPace(rec.pts);
  const now = cur ? pace(rec.type, 1000, cur * 1000, units) : null;

  const finish = async () => {
    await recorder.finish();
    router.push('/save');
  };

  const importGpx = async () => {
    setImportError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: Platform.OS === 'ios' ? '*/*' : ['application/gpx+xml', 'application/xml', 'text/xml', 'application/octet-stream'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets[0];
      if (asset.size && asset.size > 30e6) throw new Error('That file is over 30 MB. Export a single activity instead of your whole history.');
      const xml = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
      const g = parseGpx(xml);
      setDraft({ type: g.type, title: g.title, start: g.start ?? new Date(), distance: g.distance, duration: g.duration, elevGain: g.elevGain, pts: g.pts, source: 'gpx' });
      router.push('/save');
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Couldn’t read that file.');
    }
  };

  const logManually = () => {
    setDraft({ type: rec.type, title: '', start: new Date(), distance: null, duration: null, elevGain: null, pts: null, source: 'manual' });
    router.push('/save');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <TypePicker value={rec.type} onChange={(v: ActivityType) => recorder.setType(v)} />

      <LiveMap pts={rec.pts} height={rec.status === 'idle' ? 200 : 260} />

      <Card style={{ gap: 16 }}>
        <Text
          accessibilityRole="timer"
          style={[numeric, { color: rec.status === 'recording' ? t.ink : t.muted, fontSize: 72, textAlign: 'center', lineHeight: 78 }]}>
          {fmtClock(elapsed)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat big title="Distance" value={fmtDist(rec.distance, units)} unit={units} />
          <Stat big title={rec.type === 'ride' ? 'Speed now' : 'Pace now'} value={now?.value ?? '–'} unit={now?.unit} />
        </View>
        <Stat title={`Average ${avg.label.toLowerCase()}`} value={avg.value} unit={avg.unit} />

        {rec.error === 'permission' && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: t.danger }}>Tempo needs location access to map your route. Allow it in Settings, then press Start again.</Text>
            <Button title="Open Settings" onPress={() => Linking.openSettings()} />
          </View>
        )}
        {rec.error === 'services' && <Text style={{ color: t.danger }}>Location Services are off. Turn them on in your phone’s settings, then press Start again.</Text>}
        {rec.status !== 'idle' && rec.mode === 'foreground' && (
          <Text style={{ color: t.muted, fontSize: 13 }}>Keep Tempo open while you record. Recording with the screen locked needs a development build (see the README).</Text>
        )}

        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {rec.status === 'idle' && <Button title="Start" kind="primary" onPress={() => recorder.start()} style={{ flex: 1 }} />}
          {rec.status === 'recording' && (
            <>
              <Button title="Pause" onPress={() => recorder.pause()} style={{ flex: 1 }} />
              <Button title="Finish" kind="primary" onPress={finish} style={{ flex: 1 }} />
            </>
          )}
          {rec.status === 'paused' && (
            <>
              <Button title="Resume" kind="primary" onPress={() => recorder.resume()} style={{ flex: 1 }} />
              <Button title="Finish" onPress={finish} style={{ flex: 1 }} />
              <Button title="Discard" kind="danger" onPress={() => recorder.discard()} style={{ flexBasis: '100%' }} />
            </>
          )}
        </View>
      </Card>

      {rec.status === 'idle' && (
        <Card>
          <SectionTitle>Other ways to add</SectionTitle>
          <Text style={{ color: t.muted }}>Import a GPX file from Garmin, Coros, Apple Health or a Strava export, or type in a session you did without your phone.</Text>
          <View style={{ gap: 10 }}>
            <Button title="Import GPX file" onPress={importGpx} />
            <Button title="Log manually" onPress={logManually} />
          </View>
          {importError && <Text style={{ color: t.danger }}>{importError}</Text>}
        </Card>
      )}
    </ScrollView>
  );
}
