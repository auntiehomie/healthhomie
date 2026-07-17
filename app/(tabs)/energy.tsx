import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { connectOura, getOuraStatus, syncOura } from '@/lib/services/ouraClient';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

// ── Types ──────────────────────────────────────────────────────────────────────
interface OuraDaily {
  readiness?: number;
  sleep?: number;
  activity?: number;
  cyclePhase?: string;
}

type HobbyCategory = 'restorative' | 'moderate' | 'ambitious';

interface HobbySuggestion { category: HobbyCategory; items: string[] }

// ── Helpers ────────────────────────────────────────────────────────────────────
const HOBBIES: Record<HobbyCategory, string[]> = {
  restorative: ['Gentle yoga', 'Journaling', 'Meditation', 'Reading', 'Light stretching', 'Nature walk', 'Breathing exercises'],
  moderate:    ['30-min walk', 'Creative writing', 'Cooking a new recipe', 'Learning something new', 'Casual bike ride', 'Photography'],
  ambitious:   ['Strength workout', 'Long run', 'Deep work project', 'Learn a skill', 'Creative sprint', 'Cold plunge'],
};

const CYCLE_NOTES: Record<string, string> = {
  menstrual:  '🩸 Menstrual phase — rest, iron-rich foods, gentle movement',
  follicular: '🌱 Follicular phase — energy rising, great for learning + new projects',
  ovulatory:  '⚡ Ovulatory phase — peak energy and communication',
  luteal:     '🍂 Luteal phase — wind down, deep work, reduce intensity',
};

function getHobbies(readiness: number): HobbySuggestion {
  if (readiness < 40) return { category: 'restorative', items: HOBBIES.restorative.slice(0, 3) };
  if (readiness < 70) return { category: 'moderate',    items: HOBBIES.moderate.slice(0, 3) };
  return                      { category: 'ambitious',   items: HOBBIES.ambitious.slice(0, 3) };
}

// Energy curve: assign energy % to 5 time blocks based on readiness
function buildEnergyCurve(readiness: number): { label: string; pct: number }[] {
  const base = readiness / 100;
  return [
    { label: '6–9am',  pct: Math.round(base * 60) },
    { label: '9–12pm', pct: Math.round(base * 95) },
    { label: '12–2pm', pct: Math.round(base * 65) },
    { label: '2–5pm',  pct: Math.round(base * 80) },
    { label: '5–8pm',  pct: Math.round(base * 55) },
  ];
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function EnergyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scoreColor = useCallback((score: number) => {
    if (score >= 70) return colors.success;
    if (score >= 40) return '#d99a3f';
    return colors.danger;
  }, [colors]);

  const [data, setData] = useState<OuraDaily | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(null);
      const status = await getOuraStatus();
      if (!active) return;
      if (!status.connected) {
        setConnected(false);
        setData(null);
        setLoading(false);
        return;
      }
      setConnected(true);
      const result = await syncOura();
      if (!active) return;
      if (result.reason) {
        setError(result.reason);
        setLoading(false);
        return;
      }
      const latest = result.metrics?.[0];
      setData(latest ? {
        readiness: latest.readinessScore != null ? Math.round(latest.readinessScore) : undefined,
        sleep: latest.sleepScore != null ? Math.round(latest.sleepScore) : undefined,
        activity: latest.activityScore != null ? Math.round(latest.activityScore) : undefined,
      } : null);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []));

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    const result = await connectOura();
    setConnecting(false);
    if (result.reason) setError(result.reason);
    // Web navigates away immediately on success. Native returns here once the in-app
    // browser closes; useFocusEffect re-checks connection status when focus returns.
  }

  // ── Not connected ──
  if (!loading && !connected) {
    return (
      <View style={styles.center}>
        <Text style={styles.connectEmoji}>⚡</Text>
        <Text style={styles.connectTitle}>Connect your Oura Ring</Text>
        <Text style={styles.connectSub}>Link your Oura account to see your energy map, readiness score, and smart schedule suggestions.</Text>
        <Pressable style={styles.connectBtn} onPress={handleConnect} disabled={connecting}>
          <Text style={styles.connectBtnText}>{connecting ? 'Connecting…' : 'Connect Oura →'}</Text>
        </Pressable>
        {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
      </View>
    );
  }

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>⚠️ {error}</Text>
      <Text style={styles.muted}>Pull down to retry, or check your Oura connection in Settings.</Text>
    </View>
  );

  const readiness = data?.readiness ?? 50;
  const sleep = data?.sleep ?? 0;
  const activity = data?.activity ?? 0;
  const hobby = getHobbies(readiness);
  const curve = buildEnergyCurve(readiness);
  const cycleNote = data?.cyclePhase ? CYCLE_NOTES[data.cyclePhase] : null;
  const peakBlock = curve.reduce((best, b) => b.pct > best.pct ? b : best, curve[0]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>oura · today</Text>
        <Text style={styles.title}>Your energy map</Text>
      </View>

      {/* Cycle phase banner */}
      {cycleNote && (
        <View style={styles.cycleBanner}>
          <Text style={styles.cycleText}>{cycleNote}</Text>
        </View>
      )}

      {/* Score cards */}
      <View style={styles.scoreRow}>
        {[
          { label: 'Readiness', value: readiness },
          { label: 'Sleep',     value: sleep },
          { label: 'Activity',  value: activity },
        ].map(s => (
          <View key={s.label} style={styles.scoreCard}>
            <Text style={[styles.scoreNum, { color: scoreColor(s.value) }]}>{s.value}</Text>
            <Text style={styles.scoreLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Energy curve */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Energy curve</Text>
        <Text style={styles.muted}>Best time to focus: {peakBlock.label}</Text>
        <View style={styles.curveContainer}>
          {curve.map(block => (
            <View key={block.label} style={styles.barWrapper}>
              <View style={[styles.bar, { height: Math.max(8, block.pct * 1.2), backgroundColor: block.pct >= 80 ? colors.primary : block.pct >= 60 ? '#d99a3f' : colors.textMuted }]} />
              <Text style={styles.barLabel}>{block.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Smart schedule */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Smart schedule suggestion</Text>
        <Text style={styles.muted}>Based on your readiness score of {readiness}</Text>
        {readiness >= 70 ? (
          <>
            <Text style={styles.scheduleItem}>🧠 {peakBlock.label} — Deep work / hardest task</Text>
            <Text style={styles.scheduleItem}>💬 12–2pm — Meetings, collaboration</Text>
            <Text style={styles.scheduleItem}>📋 2–5pm — Admin, reviews, light tasks</Text>
          </>
        ) : readiness >= 40 ? (
          <>
            <Text style={styles.scheduleItem}>📋 9–12pm — Lighter focused work</Text>
            <Text style={styles.scheduleItem}>🚶 12–2pm — Movement break, walk</Text>
            <Text style={styles.scheduleItem}>🧘 Afternoon — Low-stakes tasks or rest</Text>
          </>
        ) : (
          <>
            <Text style={styles.scheduleItem}>☕ Morning — Gentle start, no pressure</Text>
            <Text style={styles.scheduleItem}>🛌 Prioritize rest and recovery today</Text>
            <Text style={styles.scheduleItem}>✅ One small win is enough</Text>
          </>
        )}
      </View>

      {/* Hobby suggestion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Today&apos;s activity suggestion</Text>
        <Text style={styles.muted}>
          {hobby.category === 'restorative' ? 'Low readiness — be kind to yourself' :
           hobby.category === 'moderate'    ? 'Moderate energy — steady and intentional' :
                                              'High readiness — make the most of it'}
        </Text>
        {hobby.items.map((item, i) => (
          <Text key={i} style={styles.hobbyItem}>• {item}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container:      { padding: 20, gap: 16, backgroundColor: colors.background, paddingBottom: 40 },
    center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 16, backgroundColor: colors.background },
    hero:           { gap: 4, paddingTop: 10 },
    eyebrow:        { color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
    title:          { fontSize: 28, fontWeight: '900', color: colors.text, lineHeight: 34 },
    cycleBanner:    { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#d99a3f' },
    cycleText:      { color: colors.text, fontSize: 14, fontWeight: '600' },
    scoreRow:       { flexDirection: 'row', gap: 12 },
    scoreCard:      { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4 },
    scoreNum:       { fontSize: 36, fontWeight: '900' },
    scoreLabel:     { fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    card:           { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12 },
    cardTitle:      { fontSize: 16, fontWeight: '800', color: colors.text },
    muted:          { color: colors.textMuted, fontSize: 13 },
    curveContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 8, paddingTop: 10 },
    barWrapper:     { flex: 1, alignItems: 'center', gap: 6 },
    bar:            { width: '100%', borderRadius: 6 },
    barLabel:       { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
    scheduleItem:   { fontSize: 14, color: colors.text, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
    hobbyItem:      { fontSize: 14, color: colors.text, paddingVertical: 2 },
    connectEmoji:   { fontSize: 56 },
    connectTitle:   { fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center' },
    connectSub:     { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
    connectBtn:     { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
    connectBtnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
    errorText:      { fontSize: 16, color: colors.danger, textAlign: 'center' },
  });
