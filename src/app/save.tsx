import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { label, useTheme } from '@/components/theme';
import { Button, TypePicker } from '@/components/ui';
import { takeDraft } from '@/lib/draft';
import { autoTitle, elevLabel, FEET, fmtDur, parseDur, unitMetres } from '@/lib/format';
import { newId, saveActivity, useStore } from '@/lib/store';
import type { ActivityType } from '@/lib/types';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** "2026-10-22 07:05" in local time */
function parseDateInput(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function Save() {
  const t = useTheme();
  const { settings } = useStore();
  const units = settings.units;
  const [draft] = useState(() => takeDraft() ?? { type: 'run' as ActivityType, title: '', start: new Date(), distance: null, duration: null, elevGain: null, pts: null, source: 'manual' as const });

  const [type, setType] = useState<ActivityType>(draft.type);
  const [title, setTitle] = useState(draft.title);
  const [when, setWhen] = useState(toDateInput(draft.start));
  const [dist, setDist] = useState(draft.distance != null ? (draft.distance / unitMetres(units)).toFixed(2) : '');
  const [dur, setDur] = useState(draft.duration != null ? fmtDur(draft.duration) : '');
  const [elev, setElev] = useState(draft.elevGain != null ? String(Math.round(units === 'km' ? draft.elevGain : draft.elevGain * FEET)) : '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const distance = dist.trim() ? parseFloat(dist.replace(',', '.')) * unitMetres(units) : 0;
    const duration = parseDur(dur);
    const start = parseDateInput(when);
    const elevNum = elev.trim() ? parseFloat(elev) : 0;
    if (!Number.isFinite(distance) || distance < 0) return setError('Distance needs to be a number, like 8.2.');
    if (!(duration > 0)) return setError('Enter the time as h:mm:ss, mm:ss or minutes, like 42:30.');
    if (!start) return setError('Enter the start as YYYY-MM-DD HH:MM, like 2026-10-22 07:05.');
    if (start.getTime() > Date.now() + 60000) return setError('The start time is in the future.');
    if (!Number.isFinite(elevNum) || elevNum < 0) return setError('Elevation gain needs to be a number, like 120.');

    const id = newId();
    setSaving(true);
    try {
      await saveActivity({
        id,
        type,
        title: title.trim() || autoTitle(type, start),
        notes: notes.trim(),
        start: start.toISOString(),
        distance,
        duration,
        elevGain: units === 'km' ? elevNum : elevNum / FEET,
        pts: draft.pts,
        source: draft.source,
      });
      router.dismissAll();
      router.push(`/activity/${id}`);
    } catch {
      setError('Couldn’t save. Your phone may be out of storage.');
      setSaving(false);
    }
  };

  const discard = () => router.back();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {draft.pts && (
          <Text style={{ color: t.muted }}>
            Route attached ({draft.pts.length} GPS points). Distance, time and climb came from {draft.source === 'gpx' ? 'the file' : 'your recording'}; adjust them if you like.
          </Text>
        )}
        <TypePicker value={type} onChange={setType} />
        <Field label="Title" value={title} onChangeText={setTitle} placeholder={autoTitle(type, parseDateInput(when) ?? new Date())} />
        <Field label="Start (YYYY-MM-DD HH:MM)" value={when} onChangeText={setWhen} autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field containerStyle={{ flex: 1 }} label={`Distance (${units})`} value={dist} onChangeText={setDist} keyboardType="decimal-pad" placeholder="8.0" />
          <Field containerStyle={{ flex: 1 }} label="Time (h:mm:ss)" value={dur} onChangeText={setDur} keyboardType="numbers-and-punctuation" placeholder="42:30" />
        </View>
        <Field label={`Elevation gain (${elevLabel(units)})`} value={elev} onChangeText={setElev} keyboardType="number-pad" placeholder="0" />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="How did it feel?" multiline />
        {error && <Text style={{ color: t.danger }}>{error}</Text>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title={saving ? 'Saving…' : 'Save activity'} kind="primary" onPress={save} disabled={saving} style={{ flex: 2 }} />
          <Button title="Discard" kind="danger" onPress={discard} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label: text, containerStyle, ...props }: TextInputProps & { label: string; containerStyle?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ gap: 4 }, containerStyle]}>
      <Text style={[label, { color: t.muted }]}>{text}</Text>
      <TextInput
        {...props}
        placeholderTextColor={t.muted}
        style={[
          { borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, color: t.ink, borderRadius: 10, padding: 12, fontSize: 16 },
          props.multiline ? { minHeight: 90, textAlignVertical: 'top' } : null,
        ]}
      />
    </View>
  );
}
