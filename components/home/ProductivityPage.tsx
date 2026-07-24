import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
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
import { hapticImpact, hapticSuccess } from '@/lib/utils/haptics';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { cardShadow } from '@/lib/theme/shadow';

// ── Types ──────────────────────────────────────────────────────────────────────
type Mood = 'great' | 'good' | 'meh' | 'tired' | 'stressed';
type MoodLog = Partial<Record<DayPeriod, Mood>>;
type MoodMessages = Partial<Record<DayPeriod, string>>;
interface RoutineItem { id: string; text: string }

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

const ROUTINE_COMPLETE_MESSAGES: Record<DayPeriod, string[]> = {
  morning: [
    "Every box checked. That's how strong days start. 🎉",
    "Routine's done — the rest of the day is yours to shape.",
    'A clean sweep before most people are even up. Nice.',
  ],
  midday: [
    'All checked off, right in the middle of the day. 🎉',
    "Nothing left on the list. Keep that momentum going.",
    'Routine handled — on to whatever comes next.',
  ],
  evening: [
    "Full checklist, day well closed out. 🎉",
    'Every item done before the day wraps up.',
    "That's a complete routine. Rest easy.",
  ],
};

// Stable per day+period so the message doesn't reshuffle on every render — no extra
// storage needed since (day, period) alone is enough to seed a consistent pick.
function pickStable<T>(pool: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

type Affirmation = { text: string; author: string };

// Real, attributed quotes only - a few of the usual "inspirational quote" picks (a Churchill
// line, an "Eleanor Roosevelt" line, an "Emerson" line) turned out to be widely-circulated fakes
// with no documented source, so this list is limited to quotes with solid primary-source backing
// (a recorded speech, an autobiography, a well-documented interview).
const AFFIRMATIONS: Affirmation[] = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'People will forget what you said, people will forget what you did, but people will never forget how you made them feel.', author: 'Maya Angelou' },
  { text: 'It is hard to fail, but it is worse never to have tried to succeed.', author: 'Theodore Roosevelt' },
  { text: 'I have failed over and over and over again in my life. And that is why I succeed.', author: 'Michael Jordan' },
  { text: "I hated every minute of training, but I said, don't quit. Suffer now and live the rest of your life as a champion.", author: 'Muhammad Ali' },
  { text: 'The most difficult thing is the decision to act, the rest is merely tenacity.', author: 'Amelia Earhart' },
  { text: 'Optimism is the faith that leads to achievement. Nothing can be done without hope and confidence.', author: 'Helen Keller' },
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
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Howdy Mornin' 😴";
  if (hour < 12) return "Howdy Mornin' 🌞";
  if (hour < 18) return "Howdy Mornin' 😎";
  return "Howdy Evenin' 🌝";
}
const genRoutineId = () => `r${Date.now()}${Math.floor(Math.random() * 1000)}`;
const QUICK_NOTE_TAG = 'quick-note';
const ROUTINE_LOG_TAG = 'routine-log';

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
  const [routineDoneIds, setRoutineDoneIds] = useState<string[]>([]);
  const [routineInput, setRoutineInput] = useState('');
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [todaysQuickNotes, setTodaysQuickNotes] = useState<Note[]>([]);
  const [affirmation, setAffirmation] = useState(randomAff());
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [routineExpanded, setRoutineExpanded] = useState(false);

  // Load persisted state
  const reload = useCallback(async () => {
    const day = todayKey();
    const [ml, mm, p, w, template, doneIds, legacyRoutine, allNotes, a] = await Promise.all([
      load<MoodLog>('moodLog_' + day, {}),
      load<MoodMessages>('moodMessages_' + day, {}),
      load<string[]>('priorities_' + day, ['', '', '']),
      load<number>('water_' + day, 0),
      load<RoutineItem[]>('routineTemplate', []),
      load<string[]>('routineDone_' + day, []),
      load<(RoutineItem & { done?: boolean })[]>('routine', []),
      loadNotes(),
      load<Affirmation>('affirmation_' + day, randomAff()),
    ]);
    // A pre-existing value from before quotes carried an author (a plain string) would
    // otherwise render with no `.text`/`.author` - fall back to a fresh quote instead.
    const affirmationValue = a && typeof a === 'object' && 'text' in a ? a : randomAff();

    let r = template;
    // One-time migration from the old single-list "routine" key (items carried their own
    // `done` flag, so completed items never cleared) - carry the item texts forward as the
    // new reusable template, but not the done state, since we don't know which day it was
    // from and today's completion is tracked separately now.
    if (r.length === 0 && legacyRoutine.length > 0) {
      r = legacyRoutine.map((item, i) => ({ id: item.id ?? `${genRoutineId()}-${i}`, text: item.text }));
      void save('routineTemplate', r);
      void AsyncStorage.removeItem('morning_routine');
    }

    setMoodLog(ml); setMoodMessages(mm); setPriorities(p); setWater(w);
    setRoutine(r);
    setRoutineDoneIds(doneIds);
    setTodaysQuickNotes(allNotes.filter(n => n.tags.includes(QUICK_NOTE_TAG) && n.createdAt.slice(0, 10) === day));
    setAffirmation(affirmationValue);
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoaded(true);
    })();
  }, [reload]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const day = todayKey();

  const updateMood = useCallback((period: DayPeriod, m: Mood) => {
    hapticImpact();
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
    setRoutine(prev => { const n = [...prev, { id: genRoutineId(), text: routineInput.trim() }]; void save('routineTemplate', n); return n; });
    setRoutineInput('');
    setRoutineExpanded(false);
  }, [routineInput]);
  const toggleRoutine = useCallback((id: string) => {
    setRoutineDoneIds(prev => {
      const completing = !prev.includes(id);
      if (completing) hapticSuccess(); else hapticImpact();
      if (!completing) setRoutineExpanded(false);
      const n = completing ? [...prev, id] : prev.filter(x => x !== id);
      void save('routineDone_' + day, n);
      return n;
    });
  }, [day]);
  const deleteRoutine = useCallback((id: string) => {
    setRoutine(prev => { const n = prev.filter(r => r.id !== id); void save('routineTemplate', n); return n; });
    setRoutineDoneIds(prev => {
      if (!prev.includes(id)) return prev;
      const n = prev.filter(x => x !== id);
      void save('routineDone_' + day, n);
      return n;
    });
  }, [day]);
  // The routine template is reusable day to day - completion is tracked separately per date, so
  // it already resets on its own tomorrow. This is an optional manual "log it now" action: saves
  // a dated record of what's completed so far today to Notes, then clears today's checkmarks in
  // case you want a fresh sweep before the day is even over.
  const archiveCompletedRoutine = useCallback(async () => {
    const completed = routine.filter(r => routineDoneIds.includes(r.id));
    if (completed.length === 0) return;
    const dateLabel = new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const title = `Completed routine — ${dateLabel}`;
    const content = completed.map(r => `✅ ${r.text}`).join('\n');
    await createNote({ title, content, tags: ['daily', ROUTINE_LOG_TAG] });
    hapticSuccess();
    setRoutineDoneIds([]);
    void save('routineDone_' + day, []);
  }, [routine, routineDoneIds, day]);
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
    <View style={[styles.container, styles.fill]}>
      <Skeleton style={{ height: 32, width: '55%', marginBottom: 4 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton style={{ height: 16, width: '40%' }} />
          <Skeleton style={{ height: 44, width: '100%' }} />
        </View>
      ))}
    </View>
  );

  const currentPeriod = getDayPeriod();
  const periodConfig = MOOD_PERIODS[currentPeriod];
  const loggedMood = moodLog[currentPeriod];
  const loggedMoodObj = loggedMood ? MOODS.find(m => m.key === loggedMood) : undefined;
  const openRoutine = routine.filter(r => !routineDoneIds.includes(r.id));
  const completedRoutine = routine.filter(r => routineDoneIds.includes(r.id));
  const routineFullyDone = routine.length > 0 && openRoutine.length === 0;
  const routineCollapsed = routineFullyDone && !routineExpanded;
  const routineCompleteMessage = pickStable(ROUTINE_COMPLETE_MESSAGES[currentPeriod], day + currentPeriod);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.title}>{greeting()}</Text>
      </View>

      {/* Affirmation */}
      <Pressable style={styles.affBox} onPress={newAffirmation}>
        <Text style={styles.affText}>{affirmation.text}</Text>
        <Text style={styles.affAuthor}>— {affirmation.author}</Text>
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
        {routineCollapsed ? (
          <View style={styles.moodCollapsed}>
            <Text style={styles.moodCollapsedEmoji}>🎉</Text>
            <View style={styles.routineCollapsedBody}>
              <Text style={styles.moodCollapsedText}>{routineCompleteMessage}</Text>
              <View style={styles.completedHeaderRow}>
                <Pressable onPress={() => setRoutineExpanded(true)}>
                  <Text style={styles.noteLink}>Show checklist</Text>
                </Pressable>
                <Pressable onPress={archiveCompletedRoutine}>
                  <Text style={styles.noteLink}>Archive to Notes →</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
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
                <View style={styles.completedHeaderRow}>
                  <Text style={styles.completedLabel}>Completed ({completedRoutine.length})</Text>
                  <Pressable onPress={archiveCompletedRoutine}>
                    <Text style={styles.noteLink}>Archive to Notes →</Text>
                  </Pressable>
                </View>
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
    title:        { ...typography.display2, color: colors.text },
    affBox:       { backgroundColor: colors.primary, borderRadius: 16, padding: 18, gap: 6 },
    affText:      { color: colors.onPrimary, fontSize: 16, fontWeight: '600', lineHeight: 22 },
    affAuthor:    { color: colors.onPrimary, opacity: 0.85, fontSize: 13, fontWeight: '700' },
    affHint:      { color: colors.onPrimary, opacity: 0.7, fontSize: 11 },
    card:         { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12, ...cardShadow },
    cardTitle:    { fontSize: 16, fontWeight: '800', color: colors.text },
    moodRow:      { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    moodBtn:      { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
    moodEmoji:    { fontSize: 24 },
    moodCollapsed:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
    moodCollapsedEmoji:{ fontSize: 32 },
    moodCollapsedText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21 },
    routineCollapsedBody: { flex: 1, gap: 8 },
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
    completedHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    row:          { flexDirection: 'row', gap: 10, alignItems: 'center' },
    addBtn:       { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    addBtnDisabled:{ opacity: 0.5 },
    addBtnText:   { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
    noteInput:    { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, minHeight: 80 },
    noteLink:     { color: colors.primary, fontWeight: '600', fontSize: 12, flexShrink: 1 },
    quickNoteRow: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
    quickNoteText:{ color: colors.text, fontSize: 14 },
  });
