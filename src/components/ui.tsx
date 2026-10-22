import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ACTIVITY_TYPES, type ActivityType } from '@/lib/types';
import { label, numeric, useTheme } from './theme';

export function Stat({ title, value, unit, big }: { title: string; value: string; unit?: string; big?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ minWidth: 0, flex: 1 }}>
      <Text style={[label, { color: t.muted }]}>{title}</Text>
      <Text style={[numeric, { color: t.ink, fontSize: big ? 34 : 22 }]} numberOfLines={1}>
        {value}
        {unit ? <Text style={{ fontSize: big ? 16 : 13, color: t.muted, fontWeight: '600' }}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.ink, fontSize: 20, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>{children}</Text>;
}

export function Bib({ type }: { type: ActivityType }) {
  const t = useTheme();
  return (
    <View style={[styles.bib, { borderColor: t.accent }]}>
      <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>{ACTIVITY_TYPES[type].toUpperCase()}</Text>
    </View>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.sunk, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Text style={[label, { color: t.muted, fontSize: 10 }]}>{children}</Text>
    </View>
  );
}

type ButtonKind = 'primary' | 'plain' | 'danger';
export function Button({ title, onPress, kind = 'plain', disabled, style }: { title: string; onPress: () => void; kind?: ButtonKind; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? 'transparent' : t.sunk;
  const fg = kind === 'primary' ? t.onAccent : kind === 'danger' ? t.danger : t.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1, borderWidth: kind === 'danger' ? 1.5 : 0, borderColor: t.danger },
        style,
      ]}>
      <Text style={{ color: fg, fontSize: 16, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>{title}</Text>
    </Pressable>
  );
}

export function TypePicker({ value, onChange, includeAll }: { value: string; onChange: (v: never) => void; includeAll?: boolean }) {
  const t = useTheme();
  const opts: [string, string][] = [...(includeAll ? [['all', 'All'] as [string, string]] : []), ...Object.entries(ACTIVITY_TYPES)];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {opts.map(([k, name]) => {
        const on = k === value;
        return (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(k as never)}
            style={[styles.typeBtn, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : 'transparent' }]}>
            <Text style={{ color: on ? t.accent : t.muted, fontWeight: '700', letterSpacing: 1, fontSize: 13 }}>{name.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TabIcon({ name, color }: { name: 'feed' | 'record' | 'progress'; color: ColorValue }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {name === 'feed' && (
        <>
          <Rect x={4} y={4} width={16} height={6} rx={1.5} stroke={color} strokeWidth={2} />
          <Rect x={4} y={14} width={16} height={6} rx={1.5} stroke={color} strokeWidth={2} />
        </>
      )}
      {name === 'record' && (
        <>
          <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
          <Circle cx={12} cy={12} r={4} fill={color} />
        </>
      )}
      {name === 'progress' && <Path d="M5 19V13M10 19V8M15 19V11M20 19V5" stroke={color} strokeWidth={2.4} strokeLinecap="round" />}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16, gap: 12 },
  bib: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  button: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  typeBtn: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 11, paddingVertical: 5 },
});
