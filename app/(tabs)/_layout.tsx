import { Drawer } from 'expo-router/drawer';
import {
  Activity,
  Calendar,
  ChefHat,
  Dumbbell,
  FileText,
  Home,
  ScanBarcode,
  Settings,
} from 'lucide-react-native';
import { useTheme } from '@/lib/theme/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '900' },
        drawerStyle: { backgroundColor: colors.surface },
        drawerActiveTintColor: colors.primary,
        drawerActiveBackgroundColor: colors.surfaceAlt,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: { fontWeight: '700', fontSize: 15, marginLeft: -8 },
      }}
    >
      {/* ── New: Home (swipeable Productivity + Health) ── */}
      <Drawer.Screen
        name="index"
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => <Home size={size} color={color} />,
          headerTitle: 'Howdy Morning ☀️',
        }}
      />

      {/* ── Existing: Today (nutrition/macros) ── */}
      <Drawer.Screen
        name="today"
        options={{
          title: 'Today',
          drawerIcon: ({ color, size }) => <Activity size={size} color={color} />,
          headerTitle: 'Today',
        }}
      />

      {/* ── Existing: Food journal ── */}
      <Drawer.Screen
        name="journal"
        options={{
          title: 'Journal',
          drawerIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          headerTitle: 'Food Journal',
        }}
      />

      {/* ── New: Zettelkasten notes ── */}
      <Drawer.Screen
        name="notes"
        options={{
          title: 'Notes',
          drawerIcon: ({ color, size }) => <FileText size={size} color={color} />,
          headerTitle: 'Notes 📝',
        }}
      />

      {/* ── Existing: Goals ── */}
      <Drawer.Screen
        name="goals"
        options={{
          title: 'Goals',
          drawerIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
          headerTitle: 'Goals',
        }}
      />

      {/* ── Existing: Barcode scan ── */}
      <Drawer.Screen
        name="scan"
        options={{
          title: 'Scan',
          drawerIcon: ({ color, size }) => <ScanBarcode size={size} color={color} />,
          headerTitle: 'Scan Food',
        }}
      />

      {/* ── New: Saved recipes ── */}
      <Drawer.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          drawerIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
          headerTitle: 'Recipes',
        }}
      />

      {/* ── Existing: Settings ── */}
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerIcon: ({ color, size }) => <Settings size={size} color={color} />,
          headerTitle: 'Settings',
        }}
      />
    </Drawer>
  );
}
