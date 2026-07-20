import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { createNote, loadNotes, type Note } from '@/lib/db/notesStorage';
import { getDayPeriod, type DayPeriod } from '@/lib/domain/dayPeriod';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';

// ── Types ──────────────────────────────────────────────────────────────────────
type Mood = 'great' | 'good' | 'meh' | 'tired' | 'stressed';
type MoodLog = Partial<Record<DayPeriod, Mood>>;
type MoodMessages = Partial<Record<DayPeriod, string>>;
interface RoutineItem { id: string; text: string; done: boolean }

// ── Constants ──────────────────────────────────────────────────────────────────
const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: 'great',    emoji: '🤩', label: 'Great' },
  { key: 'good',     emoji: '😊', label: 'Good' },
  { key: 'meh',      emoji: '😐', label: 'Meh' },
  { key: 'tired',    emoji: '😴', label: 'Tired' },
  { key: 'stressed', emoji: '😤', label: 'Stressed' },
];

// Three independent check-ins per day rather than one — each logs separately and, once
// logged, the picker collapses into a period-appropriate message instead of staying open.
const MOOD_PERIODS: Record<DayPeriod, { title: string; icon: string; messages: string[] }> = {
  morning: {
    title: "Today's mood",
    icon: '☀️',
    messages: [
      'New day, clean slate — make it count. 🌅',
      "You've got everything you need to make today good.",
      'Start small, start now. Momentum builds from motion.',
      "However you're feeling, you showed up. That's the hard part.",
    ],
  },
  midday: {
    title: 'Midday check-in',
    icon: '🌤️',
    messages: [
      'Halfway there — keep the momentum going into tonight.',
      "Strong finish starts now. You've got this.",
      'The evening is yours to shape. Keep going.',
      'One check-in down. Keep showing up for yourself.',
    ],
  },
  evening: {
    title: "How you're feeling as the day ends",
    icon: '🌙',
    messages: [
      'However today went, you showed up. That counts.',
      "Rest well — tomorrow's a fresh start.",
      'You made it through. Be proud of that.',
      'Let today go. You did enough.',
    ],
  },
};

const PRIORITIES_HELPER: Record<DayPeriod, string> = {
  morning: 'Set your 3 things for today.',
  midday: "How's it going? Keep chipping away.",
  evening: 'Wrap up what you can — the rest can wait for tomorrow.',
};

const ROUTINE_HELPER: Record<DayPeriod, string> = {
  morning: 'Knock these out to start strong.',
  midday: "Still time to check these off.",
  evening: 'Last call before the day wraps.',
};

const AFFIRMATIONS = [
  'You are capable of amazing things — trust the process.',
  'Every expert was once a beginner. Keep showing up.',
  'Your consistency is your superpower. One day at a time.',
  'Small progress is still progress. Celebrate it.',
  'Clarity comes from action, not thought. Start moving.',
  "You've survived 100% of your hard days. This one too.",
  'Your future self is cheering you on right now.',
  'One small step today compounds into something incredible.',
];

// Local calendar date, not UTC — avoids the daily note/affirmation flipping at UTC midnight
// (evening in US timezones) instead of local midnight.
const todayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const randomAff = () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
const greeting = () => (new Date().getHours() >= 17 ? 'howdy evenin' : 'howdy mornin');
const genRoutineId = () => `r${Date.now()}${Math.floor(Math.random() * 1000)}`;
const QUICK_NOTE_TAG = 'quick-note';

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
export function ProductivityPage() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [moodLog, setMoodLog] = useState<MoodLog>({});
  const [moodMessages, setMoodMessages] = useState<MoodMessages>({});
  const [priorities, setPriorities] = useState(['', '', '']);
  const [water, setWater] = useState(0);
  const [routine, setRoutine] = useState<RoutineItem[]>([]);
  const [routineInput, setRoutineInput] = useState('');
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [todaysQuickNotes, setTodaysQuickNotes] = useState<Note[]>([]);
  const [affirmation, setAffirmation] = useState(randomAff());
  const [loaded, setLoaded] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      const day = todayKey();
      const [ml, mm, p, w, rawRoutine, allNotes, a] = await Promise.all([
        load<MoodLog>('moodLog_' + day, {}),
        load<MoodMessages>('moodMessages_' + day, {}),
        load<string[]>('priorities_' + day, ['', '', '']),
        load<number>('water_' + day, 0),
        load<RoutineItem[]>('routine', []),
        loadNotes(),
        load<string>('affirmation_' + day, randomAff()),
      ]);
      // Backfill ids for routine items saved before they carried one, then persist so future
      // loads read a stable id straight away.
      const r = rawRoutine.map((item, i) => ({ ...item, id: item.id ?? `${genRoutineId()}-${i}` }));
      if (r.some((item, i) => item.id !== rawRoutine[i]?.id)) void save('routine', r);

      setMoodLog(ml); setMoodMessages(mm); setPriorities(p); setWater(w);
      setRoutine(r);
      setTodaysQuickNotes(allNotes.filter(n => n.tags.includes(QUICK_NOTE_TAG) && n.createdAt.slice(0, 10) === day));
      setAffirmation(a);
      setLoaded(true);
    })();
  }, []);

  const day = todayKey();

  const updateMood = useCallback((period: DayPeriod, m: Mood) => {
    const pool = MOOD_PERIODS[period].messages;
    const message = pool[Math.floor(Math.random() * pool.length)];
    setMoodLog(prev => { const next = { ...prev, [period]: m }; void save('moodLog_' + day, next); return next; });
    setMoodMessages(prev => { const next = { ...prev, [period]: message }; void save('moodMessages_' + day, next); return next; });
  }, [day]);
  const updatePri = useCallback((i: number, v: string) => {
    setPriorities(prev => { const n = [...prev]; n[i] = v; void save('priorities_' + day, n); return n; });
  }, [day]);
  const toggleWater = useCallback((idx: number) => {
    setWater(prev => { const n = prev === idx + 1 ? idx : idx + 1; void save('water_' + day, n); return n; });
  }, [day]);
  const addRoutine = useCallback(() => {
    if (!routineInput.trim()) return;
    setRoutine(prev => { const n = [...prev, { id: genRoutineId(), text: routineInput.trim(), done: false }]; void save('routine', n); return n; });
    setRoutineInput('');
  }, [routineInput]);
  const toggleRoutine = useCallback((id: string) => {
    setRoutine(prev => { const n = prev.map(r => r.id === id ? { ...r, done: !r.done } : r); void save('routine', n); return n; });
  }, []);
  const deleteRoutine = useCallback((id: string) => {
    setRoutine(prev => { const n = prev.filter(r => r.id !== id); void save('routine', n); return n; });
  }, []);
  const addQuickNote = useCallback(async () => {
    const content = quickNoteInput.trim();
    if (!content) return;
    const title = content.length > 40 ? `${content.slice(0, 40)}…` : content;
    const note = await createNote({ title, content, tags: ['daily', QUICK_NOTE_TAG] });
    setTodaysQuickNotes(prev => [note, ...prev]);
    setQuickNoteInput('');
  }, [quickNoteInput]);
  const newAffirmation = useCallback(() => {
    const a = randomAff(); setAffirmation(a); void save('affirmation_' + day, a);
  }, [day]);

  if (!loaded) return (
    <View style={[styles.container, styles.fill, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.muted}>Loading…</Text>
    </View>
  );

  const currentPeriod = getDayPeriod();
  const periodConfig = MOOD_PERIODS[currentPeriod];
  const loggedMood = moodLog[currentPeriod];
  const loggedMoodObj = loggedMood ? MOODS.find(m => m.key === loggedMood) : undefined;
  const openRoutine = routine.filter(r => !r.done);
  const completedRoutine = routine.filter(r => r.done);

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{greeting()}</Text>
        <Text style={styles.title}>How are you showing up today?</Text>
      </View>

      {/* Affirmation */}
      <Pressable style={styles.affBox} onPress={newAffirmation}>
        <Text style={styles.affText}>{affirmation}</Text>
        <Text style={styles.affHint}>tap to refresh ✨</Text>
      </Pressable>

      {/* Mood check-in — three independent slots across the day, current one only */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{periodConfig.icon} {periodConfig.title}</Text>
        {loggedMoodObj ? (
          <View style={styles.moodCollapsed}>
            <Text style={styles.moodCollapsedEmoji}>{loggedMoodObj.emoji}</Text>
            <Text style={styles.moodCollapsedText}>{moodMessages[currentPeriod]}</Text>
          </View>
        ) : (
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <Pressable key={m.key} style={styles.moodBtn} onPress={() => updateMood(currentPeriod, m.key)}>
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Top 3 Priorities */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Top 3 priorities today</Text>
        <Text style={styles.muted}>{PRIORITIES_HELPER[currentPeriod]}</Text>
        {[0, 1, 2].map(i => (
          <TextInput
            key={i}
            style={styles.input}
            placeholder={`Priority ${i + 1}…`}
            placeholderTextColor={colors.textMuted}
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

      {/* Morning Routine — open items first, checked ones move down into Completed */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>✅ Morning routine</Text>
        <Text style={styles.muted}>{ROUTINE_HELPER[currentPeriod]}</Text>
        {routine.length === 0 && <Text style={styles.muted}>Add your morning routine steps below</Text>}
        {openRoutine.map(item => (
          <View key={item.id} style={styles.routineRow}>
            <Pressable onPress={() => toggleRoutine(item.id)} style={styles.checkbox}>
              <Text style={styles.checkboxText}>⬜</Text>
            </Pressable>
            <Text style={styles.routineText}>{item.text}</Text>
            <Pressable onPress={() => deleteRoutine(item.id)}>
              <Text style={styles.deleteBtn}>✕</Text>
            </Pressable>
          </View>
        ))}
        {completedRoutine.length > 0 && (
          <>
            <Text style={styles.completedLabel}>Completed ({completedRoutine.length})</Text>
            {completedRoutine.map(item => (
              <View key={item.id} style={styles.routineRow}>
                <Pressable onPress={() => toggleRoutine(item.id)} style={styles.checkbox}>
                  <Text style={styles.checkboxText}>✅</Text>
                </Pressable>
                <Text style={[styles.routineText, styles.routineDone]}>{item.text}</Text>
                <Pressable onPress={() => deleteRoutine(item.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Add routine item…"
            placeholderTextColor={colors.textMuted}
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

      {/* Quick Notes — each Add creates its own note, so nothing gets overwritten */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Quick notes</Text>
        <TextInput
          style={styles.noteInput}
          multiline
          placeholder="Brain dump, intentions, anything…"
          placeholderTextColor={colors.textMuted}
          value={quickNoteInput}
          onChangeText={setQuickNoteInput}
          textAlignVertical="top"
        />
        <View style={styles.row}>
          <Pressable onPress={() => router.push('/(tabs)/notes')} style={{ flex: 1 }}>
            <Text style={styles.noteLink}>View all in Notes →</Text>
          </Pressable>
          <Pressable style={[styles.addBtn, !quickNoteInput.trim() && styles.addBtnDisabled]} onPress={addQuickNote} disabled={!quickNoteInput.trim()}>
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
        {todaysQuickNotes.length > 0 && (
          <>
            <Text style={styles.completedLabel}>Today’s quick notes ({todaysQuickNotes.length})</Text>
            {todaysQuickNotes.map(note => (
              <Pressable key={note.id} onPress={() => router.push('/(tabs)/notes')} style={styles.quickNoteRow}>
                <Text style={styles.quickNoteText} numberOfLines={1}>{note.content}</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill:         { flex: 1 },
    container:    { padding: 20, gap: 16, backgroundColor: colors.background, paddingBottom: 40 },
    hero:         { gap: 4, paddingTop: 10 },
    eyebrow:      { color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
    title:        { ...typography.display2, color: colors.text },
    affBox:       { backgroundColor: colors.primary, borderRadius: 16, padding: 18, gap: 6 },
    affText:      { color: colors.onPrimary, fontSize: 16, fontWeight: '600', lineHeight: 22 },
    affHint:      { color: colors.onPrimary, opacity: 0.7, fontSize: 11 },
    card:         { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12 },
    cardTitle:    { fontSize: 16, fontWeight: '800', color: colors.text },
    moodRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    moodBtn:      { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
    moodEmoji:    { fontSize: 24 },
    moodCollapsed:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    moodCollapsedEmoji:{ fontSize: 32 },
    moodCollapsedText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21 },
    input:        { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    waterRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    glass:        { fontSize: 28, opacity: 0.25 },
    glassFilled:  { opacity: 1 },
    muted:        { color: colors.textMuted, fontSize: 13 },
    routineRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    checkboxText: { fontSize: 20 },
    routineText:  { flex: 1, fontSize: 15, color: colors.text },
    routineDone:  { textDecorationLine: 'line-through', color: colors.textMuted },
    deleteBtn:    { color: colors.textMuted, fontSize: 16, paddingHorizontal: 6 },
    completedLabel:{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    row:          { flexDirection: 'row', gap: 10, alignItems: 'center' },
    addBtn:       { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    addBtnDisabled:{ opacity: 0.5 },
    addBtnText:   { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
    noteInput:    { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, minHeight: 80 },
    noteLink:     { color: colors.primary, fontWeight: '600', fontSize: 12, flexShrink: 1 },
    quickNoteRow: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
    quickNoteText:{ color: colors.text, fontSize: 14 },
  });
