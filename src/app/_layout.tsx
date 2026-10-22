import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useTheme } from '@/components/theme';
// Importing the recorder also registers its background location task at startup.
import { recorder } from '@/lib/recorder';
import { loadStore } from '@/lib/store';

export default function RootLayout() {
  const t = useTheme();
  useEffect(() => {
    loadStore();
    recorder.restore();
  }, []);

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.accent,
          headerTitleStyle: { color: t.ink, fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: t.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activity/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="save" options={{ title: 'Save activity', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
