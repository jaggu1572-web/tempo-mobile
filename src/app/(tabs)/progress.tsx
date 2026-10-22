import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { WeekBars } from '@/components/Charts';
import { label, numeric, useTheme } from '@/components/theme';
import { Button, Card, SectionTitle, TypePicker } from '@/components/ui';
import { elevLabel, fmtDist, fmtDur, fmtElev, unitMetres } from '@/lib/format';
import { bestEfforts, EFFORTS, weeklyTotals, weekStreak } from '@/lib/stats';
import { updateSettings, useStore } from '@/lib/store';
import type { Activity, ActivityType } from '@/lib/types';

type Filter = ActivityType | 'all';

export default function Progress() {
  const t = useTheme();
  const { visible, settings } = useStore();
  const units = settings.units;
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => (filter === 'all' ? visible : visible.filter((a) => a.type === filter)), [visible, filter]);
  const weeks = useMemo(() => weeklyTotals(list), [list]);
  const effortType: ActivityType = filter === 'all' ? 'run' : filter;
  const efforts = useMemo(() => bestEfforts(visible, effortType), [visible, effortType]);

  const year = new Date().getFullYear();
  const ytd = list.filter((a) => new Date(a.start).getFullYear() === year);
  const sum = (arr: Activity[], k: 'distance' | 'duration' | 'elevGain') => arr.reduce((s, a) => s + a[k], 0);
  const streak = weekStreak(list);
  const longest = list.reduce<Activity | null>((m, a) => (!m || a.distance > m.distance ? a : m), null);
  const climb = list.reduce<Activity | null>((m, a) => (!m || a.elevGain > m.elevGain ? a : m), null);

  // The goal steps by 5 in whichever unit is showing.
  const goalStep = 5 * unitMetres(units);
  const goalM = settings.weeklyGoalKm * 1000;
  const setGoal = (m: number) => updateSettings({ weeklyGoalKm: Math.max(goalStep, m) / 1000 });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <TypePicker includeAll value={filter} onChange={setFilter} />

      <Card>
        <SectionTitle>Last 12 weeks</SectionTitle>
        <WeekBars weeks={weeks} goalM={goalM} units={units} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Text style={{ color: t.muted }}>
            Weekly goal <Text style={{ color: t.ink, fontWeight: '800' }}>{fmtDist(goalM, units, 0)} {units}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="−" onPress={() => setGoal(Math.round(goalM / goalStep - 1) * goalStep)} style={{ paddingVertical: 6, paddingHorizontal: 16 }} />
            <Button title="+" onPress={() => setGoal(Math.round(goalM / goalStep + 1) * goalStep)} style={{ paddingVertical: 6, paddingHorizontal: 16 }} />
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle>This year</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Tile title="Distance" value={fmtDist(sum(ytd, 'distance'), units, 0)} unit={units} />
          <Tile title="Moving time" value={fmtDur(sum(ytd, 'duration')).replace(/:\d\d$/, '')} unit="h:mm" />
          <Tile title="Climbed" value={Number(fmtElev(sum(ytd, 'elevGain'), units)).toLocaleString()} unit={elevLabel(units)} />
          <Tile title="Week streak" value={String(streak)} unit={streak === 1 ? 'week' : 'weeks'} />
        </View>
      </Card>

      <Card>
        <SectionTitle>Best efforts</SectionTitle>
        <Text style={{ color: t.muted }}>
          {EFFORTS[effortType]
            ? `Fastest ${effortType === 'ride' ? 'rides' : 'stretches'} found inside your recorded routes, plus your longest and hilliest days.`
            : 'Your longest and hilliest days.'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {efforts.map((e) => (
            <Tile key={e.label} title={e.label} value={fmtDur(e.seconds)} sub={e.activity.title} onPress={() => router.push(`/activity/${e.activity.id}`)} />
          ))}
          {longest && longest.distance > 0 && (
            <Tile title="Longest" value={fmtDist(longest.distance, units, 1)} unit={units} sub={longest.title} onPress={() => router.push(`/activity/${longest.id}`)} />
          )}
          {climb && climb.elevGain > 0 && (
            <Tile title="Biggest climb" value={fmtElev(climb.elevGain, units)} unit={elevLabel(units)} sub={climb.title} onPress={() => router.push(`/activity/${climb.id}`)} />
          )}
        </View>
        {!efforts.length && !longest && <Text style={{ color: t.muted }}>Record or import an activity with a route to see your best efforts.</Text>}
      </Card>
    </ScrollView>
  );
}

function Tile({ title, value, unit, sub, onPress }: { title: string; value: string; unit?: string; sub?: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ flexGrow: 1, flexBasis: '45%', backgroundColor: t.sunk, borderRadius: 10, padding: 12, gap: 2, opacity: pressed ? 0.8 : 1 })}>
      <Text style={[label, { color: t.muted }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[numeric, { color: t.ink, fontSize: 26 }]} numberOfLines={1}>
        {value}
        {unit ? <Text style={{ fontSize: 13, color: t.muted }}> {unit}</Text> : null}
      </Text>
      {sub ? (
        <Text style={{ color: t.muted, fontSize: 12 }} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}
