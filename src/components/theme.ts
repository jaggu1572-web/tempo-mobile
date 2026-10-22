import { useColorScheme } from 'react-native';

const light = {
  bg: '#EEF1F5',
  surface: '#FFFFFF',
  sunk: '#E3E8EF',
  ink: '#131925',
  muted: '#586273',
  line: '#D6DCE5',
  accent: '#2A44E8',
  accentSoft: '#DDE2FF',
  onAccent: '#FFFFFF',
  slow: '#E8962A',
  good: '#1B8F5A',
  danger: '#C2362B',
};

const dark: typeof light = {
  bg: '#0D1118',
  surface: '#161C27',
  sunk: '#1E2532',
  ink: '#E9EDF4',
  muted: '#919BAC',
  line: '#283142',
  accent: '#7387FF',
  accentSoft: '#232C52',
  onAccent: '#0D1118',
  slow: '#F0A845',
  good: '#3CC184',
  danger: '#F0705F',
};

export type Theme = typeof light & { scheme: 'light' | 'dark' };

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...(scheme === 'dark' ? dark : light), scheme };
}

/** Big race-bib numerals. */
export const numeric = { fontVariant: ['tabular-nums' as const], fontWeight: '700' as const, letterSpacing: -0.5 };
export const label = { fontSize: 11, fontWeight: '600' as const, letterSpacing: 1, textTransform: 'uppercase' as const };
