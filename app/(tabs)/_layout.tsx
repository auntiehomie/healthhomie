import { Tabs } from 'expo-router';
import {
  Activity,
  Calendar,
  Dumbbell,
  FileText,
  ScanBarcode,
  Settings,
  Sun,
  Zap,
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
      {/* ── New: Morning check-in ── */}
      <Tabs.Screen
        name="morning"
        options={{
          title: 'Morning',
          tabBarIcon: ({ color }) => <Sun size={SIZE} color={color} />,
          headerTitle: 'Morning ☀️',
        }}
      />

      {/* ── Existing: Today (nutrition/macros) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Activity size={SIZE} color={color} />,
          headerTitle: 'Today',
        }}
      />

      {/* ── New: Energy map (Oura) ── */}
      <Tabs.Screen
        name="energy"
        options={{
          title: 'Energy',
          tabBarIcon: ({ color }) => <Zap size={SIZE} color={color} />,
          headerTitle: 'Energy Map ⚡',
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
