import { Tabs } from 'expo-router';
import {
  Activity,
  Calendar,
  Dumbbell,
  FileText,
  Home,
  ScanBarcode,
  Settings,
} from 'lucide-react-native';
import ScrollableTabBar from '@/components/ScrollableTabBar';
import { useTheme } from '@/lib/theme/ThemeContext';

const SIZE = 22;

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{
        headerStyle:      { backgroundColor: colors.surface },
        headerTintColor:  colors.text,
        headerTitleStyle: { fontWeight: '900' },
      }}
    >
      {/* ── New: Home (swipeable Productivity + Health) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={SIZE} color={color} />,
          headerTitle: 'Howdy Morning ☀️',
        }}
      />

      {/* ── Existing: Today (nutrition/macros) ── */}
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Activity size={SIZE} color={color} />,
          headerTitle: 'Today',
        }}
      />

      {/* ── Existing: Food journal ── */}
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <Calendar size={SIZE} color={color} />,
          headerTitle: 'Food Journal',
        }}
      />

      {/* ── New: Zettelkasten notes ── */}
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color }) => <FileText size={SIZE} color={color} />,
          headerTitle: 'Notes 📝',
        }}
      />

      {/* ── Existing: Goals ── */}
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Goals',
          tabBarIcon: ({ color }) => <Dumbbell size={SIZE} color={color} />,
          headerTitle: 'Goals',
        }}
      />

      {/* ── Existing: Barcode scan ── */}
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <ScanBarcode size={SIZE} color={color} />,
          headerTitle: 'Scan Food',
        }}
      />

      {/* ── Existing: Settings ── */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={SIZE} color={color} />,
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
