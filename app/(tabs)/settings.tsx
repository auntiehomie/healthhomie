import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { requestHealthPermissions } from '@/lib/services/healthkit';

export default function SettingsScreen() {
  const [healthStatus, setHealthStatus] = useState('Not requested yet');

  async function connectHealth() {
    const result = await requestHealthPermissions();
    setHealthStatus(result.granted ? 'Apple Health connected' : result.reason ?? 'Apple Health unavailable');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Privacy-first defaults: local journal storage, explicit HealthKit permissions, no secrets committed.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Apple Health</Text>
        <Text style={styles.cardText}>Reads: steps, active energy, weight, sleep, workouts. Optional writes: daily nutrition totals.</Text>
        <Pressable style={[styles.button, Platform.OS !== 'ios' && styles.buttonDisabled]} onPress={connectHealth} disabled={Platform.OS !== 'ios'}>
          <Text style={styles.buttonText}>{Platform.OS === 'ios' ? 'Connect Apple Health' : 'HealthKit is iOS-only'}</Text>
        </Pressable>
        <Text style={styles.status}>{healthStatus}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>API keys</Text>
        <Text style={styles.cardText}>USDA FoodData Central key belongs in Vercel env vars as USDA_FDC_API_KEY. Do not commit .env files.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, backgroundColor: '#fffaf2' },
  title: { fontSize: 32, fontWeight: '900', color: '#211d18' },
  subtitle: { color: '#665f54', lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 18, gap: 10 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#211d18' },
  cardText: { color: '#665f54', lineHeight: 20 },
  button: { backgroundColor: '#4f7c59', borderRadius: 16, padding: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#b9b1a7' },
  buttonText: { color: '#fffaf2', fontWeight: '800' },
  status: { color: '#443d34', fontWeight: '700' },
});
