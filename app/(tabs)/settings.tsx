import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { requestHealthPermissions } from '@/lib/services/healthkit';
import { connectOura, getOuraStatus, syncOura } from '@/lib/services/ouraClient';
import { logout } from '@/lib/services/authClient';

export default function SettingsScreen() {
  const [healthStatus, setHealthStatus] = useState('Not requested yet');
  const [ouraStatus, setOuraStatus] = useState('Not connected');

  useEffect(() => {
    getOuraStatus().then((status) => {
      if (status.connected) setOuraStatus(status.lastSyncedAt ? `Connected, last synced ${status.lastSyncedAt}` : 'Connected, not synced yet');
    });
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function connectHealth() {
    const result = await requestHealthPermissions();
    setHealthStatus(result.granted ? 'Apple Health connected' : result.reason ?? 'Apple Health unavailable');
  }

  async function handleConnectOura() {
    setOuraStatus('Connecting...');
    const result = await connectOura();
    if (result.reason) setOuraStatus(result.reason);
  }

  async function handleSyncOura() {
    setOuraStatus('Syncing...');
    const result = await syncOura();
    setOuraStatus(result.reason ?? `Synced ${result.synced} days of Oura data.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Your journal and profile sync across web, iOS, and Android through your account.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Apple Health</Text>
        <Text style={styles.cardText}>Reads: steps, active energy, weight, sleep, workouts. Optional writes: daily nutrition totals.</Text>
        <Pressable style={[styles.button, Platform.OS !== 'ios' && styles.buttonDisabled]} onPress={connectHealth} disabled={Platform.OS !== 'ios'}>
          <Text style={styles.buttonText}>{Platform.OS === 'ios' ? 'Connect Apple Health' : 'HealthKit is iOS-only'}</Text>
        </Pressable>
        <Text style={styles.status}>{healthStatus}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Oura</Text>
        <Text style={styles.cardText}>Sleep, readiness, and activity for web + mobile. Works without HealthKit.</Text>
        <Pressable style={styles.button} onPress={handleConnectOura}>
          <Text style={styles.buttonText}>Connect Oura</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleSyncOura}>
          <Text style={styles.buttonText}>Sync Oura data</Text>
        </Pressable>
        <Text style={styles.status}>{ouraStatus}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>API keys</Text>
        <Text style={styles.cardText}>USDA FoodData Central key belongs in Vercel env vars as USDA_FDC_API_KEY. Do not commit .env files.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legal</Text>
        <Link href="/legal/privacy" style={styles.link}>Privacy Policy</Link>
        <Link href="/legal/terms" style={styles.link}>Terms of Service</Link>
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
  link: { color: '#4f7c59', fontWeight: '700', textDecorationLine: 'underline' },
});
