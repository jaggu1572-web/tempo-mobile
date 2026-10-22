import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ElevationChart } from '@/components/Charts';
import { RouteMap } from '@/components/RouteMap';
import { label, useTheme } from '@/components/theme';
import { Bib, Button, Card, Chip, SectionTitle, Stat } from '@/components/ui';
import { elevLabel, fmtDist, fmtDur, fmtElev, fmtWhen, pace, unitMetres } from '@/lib/format';
import { splits } from '@/lib/geo';
import { deleteActivity, findActivity, useStore } from '@/lib/store';

export default function ActivityDetail() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings, activities } = useStore();
  const units = settings.units;
  // Re-resolve when the store changes so a deleted activity disappears.
  const a = useMemo(() => findActivity(id), [id, activities]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirming, setConfirming] = useState(false);

  const sp = useMemo(() => (a ? splits(a.pts, unitMetres(units)) : []), [a, units]);

  if (!a)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ color: t.muted }}>This activity was deleted.</Text>
        <Button title="Back to feed" onPress={() => router.navigate('/')} />
      </View>
    );

  const p = pace(a.type, a.distance, a.duration, units);
  const perUnit = sp.map((s) => s.time / (s.distance / unitMetres(units)));
  const fullTimes = sp.filter((s) => !s.partial).map((s) => s.time);
  const bestIdx = fullTimes.length ? sp.findIndex((s) => !s.partial && s.time === Math.min(...fullTimes)) : -1;
  const fastest = Math.min(...perUnit);
  const slowest = Math.max(...perUnit);
  const hasElev = !!a.pts?.some((q) => q[2] != null);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <Bib type={a.type} />
            </View>
          ),
        }}
      />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={{ color: t.ink, fontSize: 30, fontWeight: '800' }}>{a.title}</Text>
          {a.example && <Chip>Example</Chip>}
        </View>
        <Text style={{ color: t.muted }}>{fmtWhen(a.start)}</Text>
      </View>

      {a.pts && (
        <View style={{ gap: 6 }}>
          <RouteMap pts={a.pts} />
          {a.pts[0][3] != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: t.muted, fontSize: 12 }}>Slower</Text>
              <View style={{ flexDirection: 'row', width: 80, height: 6, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ flex: 1, backgroundColor: t.slow }} />
                <View style={{ flex: 1, backgroundColor: t.accent }} />
              </View>
              <Text style={{ color: t.muted, fontSize: 12 }}>Faster</Text>
            </View>
          )}
        </View>
      )}

      <Card>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat big title="Distance" value={a.distance ? fmtDist(a.distance, units) : '–'} unit={a.distance ? units : undefined} />
          <Stat big title={p.label} value={p.value} unit={p.unit} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat big title="Moving time" value={fmtDur(a.duration)} />
          <Stat big title="Elevation" value={a.elevGain ? fmtElev(a.elevGain, units) : '–'} unit={a.elevGain ? elevLabel(units) : undefined} />
        </View>
      </Card>

      {!!a.notes && (
        <Card>
          <Text style={{ color: t.ink, fontSize: 16 }}>{a.notes}</Text>
        </Card>
      )}

      {a.pts && hasElev && (
        <Card>
          <SectionTitle>Elevation</SectionTitle>
          <ElevationChart pts={a.pts} units={units} />
        </Card>
      )}

      {sp.length > 1 && (
        <Card style={{ gap: 6 }}>
          <SectionTitle>Splits</SectionTitle>
          <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
            <Text style={[label, { color: t.muted, width: 44 }]}>{units}</Text>
            <Text style={[label, { color: t.muted, width: 96 }]}>{a.type === 'ride' ? 'Speed' : 'Pace'}</Text>
            <View style={{ flex: 1 }} />
            <Text style={[label, { color: t.muted, width: 56, textAlign: 'right' }]}>Elev</Text>
          </View>
          {sp.map((s, i) => {
            const sPace = pace(a.type, s.distance, s.time, units);
            const width = 35 + (65 * (slowest - perUnit[i])) / (slowest - fastest || 1);
            const best = i === bestIdx;
            const color = best ? t.accent : t.ink;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 0.5, borderTopColor: t.line }}>
                <Text style={{ width: 44, color, fontWeight: best ? '800' : '600', fontVariant: ['tabular-nums'] }}>{s.partial ? fmtDist(s.distance, units) : i + 1}</Text>
                <Text style={{ width: 96, color, fontWeight: best ? '800' : '600', fontVariant: ['tabular-nums'] }}>
                  {sPace.value}
                  <Text style={{ color: t.muted, fontSize: 12, fontWeight: '500' }}> {sPace.unit}</Text>
                </Text>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ height: 10, borderRadius: 2, width: `${width}%`, backgroundColor: t.accent, opacity: best ? 1 : 0.5 }} />
                </View>
                <Text style={{ width: 56, textAlign: 'right', color: t.muted, fontVariant: ['tabular-nums'] }}>
                  {s.elev >= 0 ? '+' : ''}
                  {fmtElev(s.elev, units)}
                </Text>
              </View>
            );
          })}
          <Text style={{ color: t.muted, fontSize: 12 }}>Fastest full split highlighted.</Text>
        </Card>
      )}

      {!a.example &&
        (confirming ? (
          <Card style={{ gap: 10 }}>
            <Text style={{ color: t.ink }}>Delete “{a.title}” for good?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Delete"
                kind="danger"
                style={{ flex: 1 }}
                onPress={async () => {
                  await deleteActivity(a.id);
                  router.back();
                }}
              />
              <Button title="Keep it" style={{ flex: 1 }} onPress={() => setConfirming(false)} />
            </View>
          </Card>
        ) : (
          <Button title="Delete activity" kind="danger" onPress={() => setConfirming(true)} />
        ))}
    </ScrollView>
  );
}
