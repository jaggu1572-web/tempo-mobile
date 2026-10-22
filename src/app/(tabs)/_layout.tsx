import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text } from 'react-native';

import { useTheme } from '@/components/theme';
import { TabIcon } from '@/components/ui';
import { useRecorder } from '@/lib/recorder';
import { updateSettings, useStore } from '@/lib/store';

function UnitToggle() {
  const t = useTheme();
  const { settings } = useStore();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Units: ${settings.units}. Tap to switch.`}
      onPress={() => updateSettings({ units: settings.units === 'km' ? 'mi' : 'km' })}
      style={{ marginRight: 16, borderWidth: 1, borderColor: t.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: t.ink, fontWeight: '800', letterSpacing: 1 }}>{settings.units.toUpperCase()}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  const rec = useRecorder();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: t.ink, fontWeight: '900', fontSize: 22, letterSpacing: 1 },
        headerTitleAlign: 'left',
        headerRight: () => <UnitToggle />,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontWeight: '700', letterSpacing: 0.5 },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'TEMPO', tabBarLabel: 'Feed', tabBarIcon: ({ color }) => <TabIcon name="feed" color={color} /> }} />
      <Tabs.Screen
        name="record"
        options={{
          title: 'RECORD',
          tabBarLabel: rec.status === 'idle' ? 'Record' : 'Recording',
          tabBarBadge: rec.status === 'recording' ? '●' : undefined,
          tabBarBadgeStyle: { backgroundColor: t.danger, color: '#fff', fontSize: 8 },
          tabBarIcon: ({ color }) => <TabIcon name="record" color={color} />,
        }}
      />
      <Tabs.Screen name="progress" options={{ title: 'PROGRESS', tabBarLabel: 'Progress', tabBarIcon: ({ color }) => <TabIcon name="progress" color={color} /> }} />
    </Tabs>
  );
}
