import { router } from 'expo-router';
import { memo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { RouteThumb } from '@/components/RouteThumb';
import { label, numeric, useTheme } from '@/components/theme';
import { Bib, Button, Card, Chip, Stat } from '@/components/ui';
import { fmtDist, fmtDur, fmtElev, fmtWhen, elevLabel, pace } from '@/lib/format';
import { thisWeekByDay } from '@/lib/stats';
import { updateSettings, useStore } from '@/lib/store';
import type { Activity, Units } from '@/lib/types';

export default function Feed() {
  const t = useTheme();
  const { visible, showingExamples, settings, loaded } = useStore();

  return (
    <FlatList
      data={visible}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          {showingExamples && (
            <View style={{ backgroundColor: t.accentSoft, borderRadius: 12, padding: 14, gap: 6 }}>
              <Text style={{ color: t.ink }}>These are example activities. Record or import your first one and they’ll step aside.</Text>
              <Pressable accessibilityRole="button" onPress={() => updateSettings({ hideExamples: true })}>
                <Text style={{ color: t.accent, fontWeight: '700' }}>Hide examples</Text>
              </Pressable>
            </View>
          )}
          <WeekSummary list={visible} units={settings.units} goalM={settings.weeklyGoalKm * 1000} />
        </View>
      }
      ListEmptyComponent={
        loaded ? (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ color: t.ink, fontSize: 20, fontWeight: '800' }}>No activities yet</Text>
            <Text style={{ color: t.muted, textAlign: 'center' }}>Head to Record to track a run or ride with GPS, or import a GPX file.</Text>
            <Button title="Record an activity" kind="primary" onPress={() => router.navigate('/record')} />
          </Card>
        ) : undefined
      }
      renderItem={({ item }) => <ActivityCard a={item} units={settings.units} />}
    />
  );
}

function WeekSummary({ list, units, goalM }: { list: Activity[]; units: Units; goalM: number }) {
  const t = useTheme();
  const days = thisWeekByDay(list);
  const total = days.reduce((s, d) => s + d, 0);
  const max = Math.max(...days, 1);
  const today = (new Date().getDay() + 6) % 7;
  const pct = Math.min(1, total / goalM);
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <View>
          <Text style={[label, { color: t.muted }]}>This week</Text>
          <Text style={[numeric, { color: t.ink, fontSize: 42, lineHeight: 46 }]}>
            {fmtDist(total, units, 1)}
            <Text style={{ fontSize: 18, color: t.muted }}> {units}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {'MTWTFSS'.split('').map((d, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 3 }}>
              <View style={{ width: 16, height: 36, borderRadius: 3, backgroundColor: t.sunk, justifyContent: 'flex-end', overflow: 'hidden' }}>
                <View style={{ height: `${(days[i] / max) * 100}%`, backgroundColor: t.accent }} />
              </View>
              <Text style={{ fontSize: 11, color: i === today ? t.ink : t.muted, fontWeight: i === today ? '800' : '500' }}>{d}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 6, backgroundColor: t.sunk, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: t.accent }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: t.muted, fontSize: 13 }}>{pct >= 1 ? 'Weekly goal reached' : `${fmtDist(goalM - total, units, 1)} ${units} to go`}</Text>
        <Text style={{ color: t.muted, fontSize: 13 }}>Goal {fmtDist(goalM, units, 0)} {units}</Text>
      </View>
    </Card>
  );
}

const ActivityCard = memo(function ActivityCard({ a, units }: { a: Activity; units: Units }) {
  const t = useTheme();
  const p = pace(a.type, a.distance, a.duration, units);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/activity/${a.id}`)}
      style={({ pressed }) => ({ backgroundColor: t.surface, borderRadius: 14, borderWidth: 0.5, borderColor: pressed ? t.accent : t.line, overflow: 'hidden' })}>
      <View style={{ padding: 16, paddingBottom: 10, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Bib type={a.type} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={{ color: t.ink, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                {a.title}
              </Text>
              {a.example && <Chip>Example</Chip>}
            </View>
            <Text style={{ color: t.muted, fontSize: 13 }}>
              {fmtWhen(a.start)}
              {a.elevGain >= 1 ? ` · ${fmtElev(a.elevGain, units)} ${elevLabel(units)} climb` : ''}
            </Text>
          </View>
        </View>
        {!!a.notes && <Text style={{ color: t.muted }}>{a.notes}</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat title="Distance" value={a.distance ? fmtDist(a.distance, units) : '–'} unit={a.distance ? units : undefined} />
          <Stat title={p.label} value={p.value} unit={p.unit} />
          <Stat title="Time" value={fmtDur(a.duration)} />
        </View>
      </View>
      {a.pts ? (
        <RouteThumb pts={a.pts} />
      ) : (
        <View style={{ backgroundColor: t.sunk, padding: 14 }}>
          <Text style={{ color: t.muted, fontSize: 13 }}>No route recorded</Text>
        </View>
      )}
    </Pressable>
  );
});
