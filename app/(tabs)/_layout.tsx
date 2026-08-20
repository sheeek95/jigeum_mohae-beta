import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '위젯', tabBarIcon: ({ color, size }) => <Ionicons name="apps-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="poke"
        options={{ title: '찌르기', tabBarIcon: ({ color, size }) => <Ionicons name="hand-left-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="album"
        options={{ title: '앨범', tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
