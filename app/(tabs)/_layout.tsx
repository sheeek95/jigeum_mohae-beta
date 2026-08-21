import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../src/theme/tokens';

const CONTENT_HEIGHT = 54;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

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
          height: CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}>
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
