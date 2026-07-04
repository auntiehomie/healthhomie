import { Tabs } from 'expo-router';
import { Apple, Barcode, Goal, House, Settings } from 'lucide-react-native';

const color = '#4f7c59';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: color,
        headerStyle: { backgroundColor: '#fffaf2' },
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: { backgroundColor: '#fffaf2' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color: iconColor }) => <House color={iconColor} size={22} /> }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: ({ color: iconColor }) => <Apple color={iconColor} size={22} /> }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals', tabBarIcon: ({ color: iconColor }) => <Goal color={iconColor} size={22} /> }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: ({ color: iconColor }) => <Barcode color={iconColor} size={22} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color: iconColor }) => <Settings color={iconColor} size={22} /> }} />
    </Tabs>
  );
}
