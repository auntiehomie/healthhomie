import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ── Types ──────────────────────────────────────────────────────────────────────
type Mood = 'great' | 'good' | 'meh' | 'tired' | 'stressed';
interface RoutineItem { text: string; done: boolean }

// ── Constants ──────────────────────────────────────────────────────────────────
const MOODS: { key: Mood; emoji: string; label: string; note: string }[] = [
  { key: 'great',    emoji: '🤩', label: 'Great',    note: "You're on fire today 🔥 Let's make it count!" },
  { key: 'good',     emoji: '😊', label: 'Good',     note: 'Solid start! Keep that momentum 💪' },
  { key: 'meh',      emoji: '😐', label: 'Meh',      note: 'Meh days still move forward. One thing at a time.' },
  { key: 'tired',    emoji: '😴', label: 'Tired',    note: 'Rest is productive too. Be gentle with yourself 🌙' },
  { key: 'stressed', emoji: '😤', label: 'Stressed', note: "Breathe. You&apos;ve handled hard days before. Start small." },
];

const AFFIRMATIONS = [
  'You are capable of amazing things — trust the process.',
  'Every expert was once a beginner. Keep showing up.',
  'Your consistency is your superpower. One day at a time.',
  'Small progress is still progress. Celebrate it.',
  'Clarity comes from action, not thought. Start moving.',
  "You&apos;ve survived 100% of your hard days. This one too.",
  'Your future self is cheering you on right now.',
  'One small step today compounds into something incredible.',
];

const todayKey = () => new Date().toISOString().split('T')[0];
const randomAff = () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

// ── Storage helpers ────────────────────────────────────────────────────────────
async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem('morning_' + key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
async function save(key: string, value: unknown) {
  try { await AsyncStorage.setItem('morning_' + key, JSON.stringify(value)); } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function MorningScreen() {
  const [mood, setMood] = useState<Mood | null>(null);
  const [priorities, setPriorities] = useState(['', '', '']);
  const [water, setWater] = useState(0);
  const [routine, setRoutine] = useState<RoutineItem[]>([]);
  const [routineInput, setRoutineInput] = useState('');
  const [morningNote, setMorningNote] = useState('');
  const [affirmation, setAffirmation] = useState(randomAff());
  const [loaded, setLoaded] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      const day = todayKey();
      const [m, p, w, r, n, a] = await Promise.all([
        load<Mood | null>('mood_' + day, null),
        load<string[]>('priorities_' + day, ['', '', '']),
        load<number>('water_' + day, 0),
        load<RoutineItem[]>('routine', []),
        load<string>('note_' + day, ''),
        load<string>('affirmation_' + day, randomAff()),
      ]);
      setMood(m); setPriorities(p); setWater(w);
      setRoutine(r); setMorningNote(n); setAffirmation(a);
      setLoaded(true);
    })();
  }, []);

  const day = todayKey();

  const updateMood = useCallback((m: Mood) => { setMood(m); void save('mood_' + day, m); }, [day]);
  const updatePri = useCallback((i: number, v: string) => {
    setPriorities(prev => { const n = [...prev]; n[i] = v; void save('priorities_' + day, n); return n; });
  }, [day]);
  const toggleWater = useCallback((idx: number) => {
    setWater(prev => { const n = prev === idx + 1 ? idx : idx + 1; void save('water_' + day, n); return n; });
  }, [day]);
  const addRoutine = useCallback(() => {
    if (!routineInput.trim()) return;
    setRoutine(prev => { const n = [...prev, { text: routineInput.trim(), done: false }]; void save('routine', n); return n; });
    setRoutineInput('');
  }, [routineInput]);
  const toggleRoutine = useCallback((i: number) => {
    setRoutine(prev => { const n = prev.map((r, idx) => idx === i ? { ...r, done: !r.done } : r); void save('routine', n); return n; });
  }, []);
  const deleteRoutine = useCallback((i: number) => {
    setRoutine(prev => { const n = prev.filter((_, idx) => idx !== i); void save('routine', n); return n; });
  }, []);
  const updateNote = useCallback((v: string) => { setMorningNote(v); void save('note_' + day, v); }, [day]);
  const newAffirmation = useCallback(() => {
    const a = randomAff(); setAffirmation(a); void save('affirmation_' + day, a);
  }, [day]);

  if (!loaded) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.muted}>Loading…</Text>
    </View>
  );

  const moodObj = MOODS.find(m => m.key === mood);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>good morning</Text>
        <Text style={styles.title}>How are you showing up today?</Text>
      </View>

      {/* Affirmation */}
      <Pressable style={styles.affBox} onPress={newAffirmation}>
        <Text style={styles.affText}>{affirmation}</Text>
        <Text style={styles.affHint}>tap to refresh ✨</Text>
      </Pressable>

      {/* Mood */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>☀️ Today&apos;s mood</Text>
        <View style={styles.moodRow}>
          {MOODS.map(m => (
            <Pressable key={m.key} style={[styles.moodBtn, mood === m.key && styles.moodBtnActive]} onPress={() => updateMood(m.key)}>
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
            </Pressable>
          ))}
        </View>
        {moodObj && <Text style={styles.moodNote}>{moodObj.note}</Text>}
      </View>

      {/* Top 3 Priorities */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Top 3 priorities today</Text>
        {[0, 1, 2].map(i => (
          <TextInput
            key={i}
            style={styles.input}
            placeholder={`Priority ${i + 1}…`}
            placeholderTextColor="#9e9891"
            value={priorities[i] ?? ''}
            onChangeText={v => updatePri(i, v)}
          />
        ))}
      </View>

      {/* Hydration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💧 Hydration</Text>
        <Text style={styles.muted}>Tap as you drink — goal: 8 glasses</Text>
        <View style={styles.waterRow}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <Pressable key={i} onPress={() => toggleWater(i)}>
              <Text style={[styles.glass, i < water && styles.glassFilled]}>🥤</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.muted}>{water} / 8{water >= 8 ? ' 🎉' : ''}</Text>
      </View>

      {/* Morning Routine */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✅ Morning routine</Text>
        {routine.length === 0 && <Text style={styles.muted}>Add your morning routine steps below</Text>}
        {routine.map((item, i) => (
          <View key={i} style={styles.routineRow}>
            <Pressable onPress={() => toggleRoutine(i)} style={styles.checkbox}>
              <Text style={styles.checkboxText}>{item.done ? '✅' : '⬜'}</Text>
            </Pressable>
            <Text style={[styles.routineText, item.done && styles.routineDone]}>{item.text}</Text>
            <Pressable onPress={() => deleteRoutine(i)}>
              <Text style={styles.deleteBtn}>✕</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Add routine item…"
            placeholderTextColor="#9e9891"
            value={routineInput}
            onChangeText={setRoutineInput}
            onSubmitEditing={addRoutine}
            returnKeyType="done"
          />
          <Pressable style={styles.addBtn} onPress={addRoutine}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Morning Note */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Today&apos;s note</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder="Brain dump, intentions, anything…"
          placeholderTextColor="#9e9891"
          value={morningNote}
          onChangeText={updateNote}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );
}

const C = { bg: '#fffaf2', card: '#ffffff', accent: '#4f7c59', accent2: '#d0903f', muted: '#9e9891', text: '#211d18', border: '#e8e1d8' };

const styles = StyleSheet.create({
  container:    { padding: 20, gap: 16, backgroundColor: C.bg, paddingBottom: 40 },
  hero:         { gap: 4, paddingTop: 10 },
  eyebrow:      { color: C.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  title:        { fontSize: 28, fontWeight: '900', color: C.text, lineHeight: 34 },
  affBox:       { backgroundColor: C.accent, borderRadius: 16, padding: 18, gap: 6 },
  affText:      { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 22 },
  affHint:      { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  card:         { backgroundColor: C.card, borderRadius: 20, padding: 18, gap: 12 },
  cardTitle:    { fontSize: 16, fontWeight: '800', color: C.text },
  moodRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  moodBtn:      { width: 52, height: 52, borderRadius: 26, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  moodBtnActive:{ borderColor: C.accent, backgroundColor: '#e8f0ea' },
  moodEmoji:    { fontSize: 24 },
  moodNote:     { color: C.muted, fontSize: 13 },
  input:        { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  waterRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  glass:        { fontSize: 28, opacity: 0.25 },
  glassFilled:  { opacity: 1 },
  muted:        { color: C.muted, fontSize: 13 },
  routineRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  checkboxText: { fontSize: 20 },
  routineText:  { flex: 1, fontSize: 15, color: C.text },
  routineDone:  { textDecorationLine: 'line-through', color: C.muted },
  deleteBtn:    { color: C.muted, fontSize: 16, paddingHorizontal: 6 },
  row:          { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addBtn:       { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  noteInput:    { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border, minHeight: 120 },
});
