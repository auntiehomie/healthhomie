import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { createId, deleteExercise, insertExercise, listExercises } from '@/lib/db/database';
import { EXERCISE_TYPES, EXERCISE_TYPE_LABELS, estimateCaloriesBurned, exerciseChipColor, summarizeExerciseByDate } from '@/lib/domain/exercise';
import { todayKey } from '@/lib/domain/nutrition';
import { hapticSuccess } from '@/lib/utils/haptics';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { cardShadow } from '@/lib/theme/shadow';
import { Trash2 } from 'lucide-react-native';
import type { ExerciseEntry, ExerciseType } from '@/types/healthhomie';

export default function ExerciseScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState<ExerciseType>('strength');
  const [durationInput, setDurationInput] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const today = todayKey();
  const todaySummary = useMemo(() => summarizeExerciseByDate(today, entries), [entries, today]);
  const todayEntries = useMemo(() => entries.filter((e) => e.date === today), [entries, today]);

  // Weekly summary
  const weekAgo = useMemo(() => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [today]);

  const weekSummary = useMemo(() => {
    const weekEntries = entries.filter((e) => e.date >= weekAgo && e.date <= today);
    return {
      totalMin: weekEntries.reduce((s, e) => s + e.durationMin, 0),
      totalCal: weekEntries.reduce((s, e) => s + (e.caloriesBurned ?? 0), 0),
      sessions: weekEntries.length,
      byType: weekEntries.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + e.durationMin;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [entries, weekAgo, today]);

  const load = useCallback(async () => {
    const allEntries = await listExercises();
    setEntries(allEntries);
  }, []);

  useFocusEffect(useCallback(() => {
    load().catch(console.warn);
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  async function handleSave() {
    const duration = Number(durationInput);
    if (!Number.isFinite(duration) || duration <= 0) {
      if (Platform.OS === 'web') window.alert('Please enter a valid duration in minutes.');
      else Alert.alert('Invalid duration', 'Please enter a valid duration in minutes.');
      return;
    }

    setSaving(true);
    try {
      const calories = caloriesInput.trim() ? Number(caloriesInput) : undefined;
      if (calories != null && (!Number.isFinite(calories) || calories < 0)) {
        setSaving(false);
        return;
      }

      const entry: ExerciseEntry = {
        id: createId('ex'),
        type: selectedType,
        durationMin: duration,
        caloriesBurned: calories,
        date: today,
        hour: new Date().getHours(),
        notes: notesInput.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await insertExercise(entry);
      hapticSuccess();

      // Reset form
      setDurationInput('');
      setCaloriesInput('');
      setNotesInput('');

      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      if (Platform.OS === 'web') window.alert(`Failed to save exercise: ${msg}`);
      else Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    try {
      await deleteExercise(entryId);
      hapticSuccess();
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      if (Platform.OS === 'web') window.alert(`Failed to delete: ${msg}`);
      else Alert.alert('Delete failed', msg);
    }
  }

  function confirmDelete(entryId: string, type: string, duration: number) {
    const message = `${EXERCISE_TYPE_LABELS[type as ExerciseType] || type} — ${duration} min`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete exercise entry?\n\n${message}`)) void handleDelete(entryId);
      return;
    }
    Alert.alert('Delete exercise?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(entryId) },
    ]);
  }

  const estimatedCal = useMemo(() => {
    const dur = Number(durationInput);
    if (!Number.isFinite(dur) || dur <= 0) return null;
    return estimateCaloriesBurned(selectedType, dur);
  }, [selectedType, durationInput]);

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <Text style={styles.title}>Exercise</Text>
      <Text style={styles.subtitle}>Log your workouts and track weekly volume.</Text>

      {/* Today's summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{todaySummary.totalMinutes}</Text>
            <Text style={styles.summaryUnit}>min</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{todaySummary.totalCalories}</Text>
            <Text style={styles.summaryUnit}>kcal</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{todaySummary.count}</Text>
            <Text style={styles.summaryUnit}>sessions</Text>
          </View>
        </View>
      </View>

      {/* Log form */}
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Log exercise</Text>

        {/* Type picker */}
        <Text style={styles.label}>Type</Text>
        <View style={styles.chipRow}>
          {EXERCISE_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.chip,
                selectedType === type && { backgroundColor: exerciseChipColor(type) },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedType === type && { color: '#fff' },
                ]}
              >
                {EXERCISE_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={durationInput}
          onChangeText={setDurationInput}
          placeholder="e.g. 45"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />

        {/* Estimated calories */}
        {estimatedCal != null && !caloriesInput.trim() ? (
          <Text style={styles.estimate}>~{estimatedCal} kcal estimated — enter a manual value to override</Text>
        ) : null}

        {/* Manual calories */}
        <Text style={styles.label}>Calories burned (optional)</Text>
        <TextInput
          style={styles.input}
          value={caloriesInput}
          onChangeText={setCaloriesInput}
          placeholder={estimatedCal != null ? `~${estimatedCal}` : 'e.g. 300'}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />

        {/* Notes */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notesInput}
          onChangeText={setNotesInput}
          placeholder="How'd it feel? PR? Etc."
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={() => void handleSave()}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Log exercise'}</Text>
        </Pressable>
      </View>

      {/* Weekly summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>This week</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{weekSummary.totalMin}</Text>
            <Text style={styles.summaryUnit}>total min</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{weekSummary.totalCal}</Text>
            <Text style={styles.summaryUnit}>kcal burned</Text>
          </View>
          <View style={styles.summaryMetric}>
            <Text style={styles.summaryValue}>{weekSummary.sessions}</Text>
            <Text style={styles.summaryUnit}>sessions</Text>
          </View>
        </View>
        {/* Per-type breakdown */}
        {Object.entries(weekSummary.byType).length > 0 ? (
          <View style={styles.breakdownRow}>
            {Object.entries(weekSummary.byType).map(([type, min]) => (
              <View key={type} style={styles.breakdownChip}>
                <View
                  style={[
                    styles.breakdownDot,
                    { backgroundColor: exerciseChipColor(type as ExerciseType) },
                  ]}
                />
                <Text style={styles.breakdownText}>
                  {EXERCISE_TYPE_LABELS[type as ExerciseType] || type}: {min}m
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No exercise logged this week yet.</Text>
        )}
      </View>

      {/* Today's logged exercises */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today&apos;s exercises</Text>
        {todayEntries.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet today. Use the form above to log your first workout.</Text>
        ) : (
          todayEntries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryInfo}>
                <View style={styles.entryHeader}>
                  <View
                    style={[styles.typeDot, { backgroundColor: exerciseChipColor(entry.type) }]}
                  />
                  <Text style={styles.entryType}>
                    {EXERCISE_TYPE_LABELS[entry.type]}
                  </Text>
                  <Text style={styles.entryDuration}>{entry.durationMin} min</Text>
                </View>
                {entry.caloriesBurned != null ? (
                  <Text style={styles.entryCal}>{entry.caloriesBurned} kcal</Text>
                ) : null}
                {entry.notes ? (
                  <Text style={styles.entryNotes}>{entry.notes}</Text>
                ) : null}
              </View>
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
                onPress={() => confirmDelete(entry.id, entry.type, entry.durationMin)}
              >
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 16, backgroundColor: colors.background },
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    summaryCard: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: 18,
      gap: 12,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    summaryGrid: { flexDirection: 'row', gap: 12 },
    summaryMetric: { flex: 1, alignItems: 'center', gap: 2 },
    summaryValue: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.onPrimary,
    },
    summaryUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.onPrimary,
      opacity: 0.8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 10,
      ...cardShadow,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      ...cardShadow,
    },
    label: { color: colors.textMuted, fontWeight: '600', fontSize: 13, marginTop: 2 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.chipBackground,
    },
    chipText: { color: colors.chipText, fontWeight: '700', fontSize: 13 },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    notesInput: { minHeight: 60, textAlignVertical: 'top' },
    estimate: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontWeight: '800',
      fontSize: 16,
    },
    breakdownRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    breakdownChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    breakdownDot: { width: 8, height: 8, borderRadius: 4 },
    breakdownText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    empty: { color: colors.textMuted, fontStyle: 'italic' },
    entryRow: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    entryInfo: { flex: 1, gap: 4 },
    entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeDot: { width: 10, height: 10, borderRadius: 5 },
    entryType: { color: colors.text, fontWeight: '800', fontSize: 15 },
    entryDuration: { color: colors.textMuted, fontSize: 13 },
    entryCal: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    entryNotes: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
    deleteBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });