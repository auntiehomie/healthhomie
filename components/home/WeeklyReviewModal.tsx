import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { getUserProfile, listFoodItems, listMealEntries, saveUserProfile } from '@/lib/db/database';
import { loadNotes, type Note } from '@/lib/db/notesStorage';
import { calculateDailyGoal, recommendWeeklyAdjustment } from '@/lib/domain/goals';
import { addMacros, emptyMacros, scaleMacros, todayKey } from '@/lib/domain/nutrition';
import { currentReviewWeekIndex, datesInRange, reviewWeekRange } from '@/lib/domain/weeklyReview';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { cardShadow } from '@/lib/theme/shadow';

const LAST_SHOWN_KEY = 'weekly_review_last_shown_week_index';

type WeekSummary = { avgCalories: number; avgProteinG: number; avgCarbsG: number; avgFatG: number; daysLogged: number };

const KG_PER_LB = 0.45359237;
const kgToLb = (kg: number) => kg / KG_PER_LB;
const lbToKg = (lb: number) => lb * KG_PER_LB;

function formatRangeLabel(start: string, end: string): string {
  const startLabel = new Date(`${start}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = new Date(`${end}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

/** Renders nothing until a new weekly review is actually due, then pops itself up with a fade + scale transition. */
export function WeeklyReviewModal() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeekSummary | null>(null);
  const [weekNotes, setWeekNotes] = useState<Note[]>([]);
  const [insight, setInsight] = useState<{ recommendedCalorieDelta: number; insight: string } | null>(null);
  const [currentWeightKg, setCurrentWeightKg] = useState<number | undefined>(undefined);
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
  const [weightSaved, setWeightSaved] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.92));

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await getUserProfile();
      if (!active) return;
      const planStart = profile.createdAt.slice(0, 10);
      const weekIndex = currentReviewWeekIndex(planStart, todayKey());
      if (weekIndex == null) return;

      const lastShownRaw = await AsyncStorage.getItem(LAST_SHOWN_KEY);
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;
      if (weekIndex <= lastShown) return;

      const weekRange = reviewWeekRange(planStart, weekIndex);
      const [entries, foods, notes] = await Promise.all([listMealEntries(), listFoodItems(), loadNotes()]);
      if (!active) return;

      const byId = new Map(foods.map((food) => [food.id, food]));
      const dates = datesInRange(weekRange.start, weekRange.end);
      let totals = emptyMacros();
      let daysLogged = 0;
      for (const date of dates) {
        const dayEntries = entries.filter((entry) => entry.date === date);
        if (dayEntries.length > 0) daysLogged += 1;
        for (const entry of dayEntries) {
          const food = byId.get(entry.foodItemId);
          if (food) totals = addMacros(totals, scaleMacros(food, entry.servings));
        }
      }

      const summary: WeekSummary = {
        avgCalories: totals.calories / 7,
        avgProteinG: totals.proteinG / 7,
        avgCarbsG: totals.carbsG / 7,
        avgFatG: totals.fatG / 7,
        daysLogged,
      };

      const goal = calculateDailyGoal(profile);
      const computedInsight = recommendWeeklyAdjustment({
        goal,
        checkIn: {
          weekStart: weekRange.start,
          averageCalories: summary.avgCalories,
          averageProteinG: summary.avgProteinG,
          averageWeightKg: profile.currentWeightKg,
          adherencePct: (daysLogged / 7) * 100,
        },
      });

      const relevantNotes = notes.filter((note) => {
        const created = note.createdAt.slice(0, 10);
        const updated = note.updatedAt.slice(0, 10);
        return (created >= weekRange.start && created <= weekRange.end) || (updated >= weekRange.start && updated <= weekRange.end);
      });

      if (!active) return;
      setRange(weekRange);
      setWeekSummary(summary);
      setWeekNotes(relevantNotes);
      setInsight(computedInsight);
      setCurrentWeightKg(profile.currentWeightKg);
      setWeightInput(profile.currentWeightKg ? String(Math.round(kgToLb(profile.currentWeightKg) * 10) / 10) : '');
      setVisible(true);
      await AsyncStorage.setItem(LAST_SHOWN_KEY, String(weekIndex));

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8 }),
      ]).start();
    })().catch(console.warn);
    return () => { active = false; };
  }, [opacity, scale]);

  function toggleWeightUnit(next: 'lb' | 'kg') {
    if (next === weightUnit) return;
    const value = Number(weightInput);
    if (Number.isFinite(value) && value > 0) {
      const converted = next === 'kg' ? lbToKg(value) : kgToLb(value);
      setWeightInput(String(Math.round(converted * 10) / 10));
    }
    setWeightUnit(next);
  }

  async function saveWeight() {
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value <= 0) return;
    const kgValue = weightUnit === 'lb' ? lbToKg(value) : value;
    const profile = await getUserProfile();
    await saveUserProfile({ ...profile, currentWeightKg: kgValue, updatedAt: new Date().toISOString() });
    setCurrentWeightKg(kgValue);
    setWeightSaved(true);
  }

  function close() {
    setVisible(false);
  }

  function goToGoals() {
    setVisible(false);
    router.push('/(tabs)/goals');
  }

  if (!visible || !range || !weekSummary) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.sheet, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.title}>Your week in review</Text>
          <Text style={styles.subtitle}>{formatRangeLabel(range.start, range.end)}</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🍽️ Food & health</Text>
              <Text style={styles.big}>{Math.round(weekSummary.avgCalories)} kcal/day avg</Text>
              <Text style={styles.meta}>{Math.round(weekSummary.avgProteinG)}g protein · {Math.round(weekSummary.avgCarbsG)}g carbs · {Math.round(weekSummary.avgFatG)}g fat</Text>
              <Text style={styles.meta}>Logged {weekSummary.daysLogged} of 7 days</Text>
              {insight && (
                <>
                  <Text style={styles.insightText}>{insight.insight}</Text>
                  {insight.recommendedCalorieDelta !== 0 && (
                    <Text style={styles.insightDelta}>
                      Suggested delta: {insight.recommendedCalorieDelta > 0 ? '+' : ''}{insight.recommendedCalorieDelta} kcal
                    </Text>
                  )}
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📝 Notes this week</Text>
              {weekNotes.length === 0 ? (
                <Text style={styles.meta}>No notes written this week.</Text>
              ) : (
                <>
                  <Text style={styles.meta}>{weekNotes.length} note{weekNotes.length === 1 ? '' : 's'}</Text>
                  {weekNotes.slice(0, 4).map((note) => (
                    <Text key={note.id} style={styles.noteTitle} numberOfLines={1}>• {note.title}</Text>
                  ))}
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚖️ Update your weight</Text>
              <View style={styles.weightRow}>
                <TextInput
                  value={weightInput}
                  onChangeText={(value) => { setWeightInput(value); setWeightSaved(false); }}
                  keyboardType="decimal-pad"
                  placeholder={weightUnit}
                  placeholderTextColor={colors.textMuted}
                  style={styles.weightInput}
                />
                <View style={styles.unitToggleRow}>
                  <Pressable onPress={() => toggleWeightUnit('lb')} style={[styles.unitToggleBtn, weightUnit === 'lb' && styles.unitToggleBtnActive]}>
                    <Text style={[styles.unitToggleText, weightUnit === 'lb' && styles.unitToggleTextActive]}>lb</Text>
                  </Pressable>
                  <Pressable onPress={() => toggleWeightUnit('kg')} style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}>
                    <Text style={[styles.unitToggleText, weightUnit === 'kg' && styles.unitToggleTextActive]}>kg</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.weightSaveButton} onPress={saveWeight}>
                  <Text style={styles.weightSaveButtonText}>Save</Text>
                </Pressable>
              </View>
              {weightSaved && <Text style={styles.savedText}>Saved</Text>}
              {currentWeightKg == null && !weightSaved && <Text style={styles.meta}>No weight on file yet.</Text>}
            </View>
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={goToGoals}>
              <Text style={styles.secondaryButtonText}>Change goals</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={close}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: colors.background, borderRadius: 28, padding: 22, gap: 14, maxHeight: '90%' },
    title: { ...typography.title1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    scroll: { flexGrow: 0 },
    scrollContent: { gap: 14 },
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 6, ...cardShadow },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    big: { fontSize: 22, fontWeight: '900', color: colors.primary, marginTop: 2 },
    meta: { color: colors.textMuted, fontSize: 13 },
    insightText: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4 },
    insightDelta: { color: colors.text, fontWeight: '800', fontSize: 13 },
    noteTitle: { color: colors.text, fontSize: 13 },
    weightRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    weightInput: { flex: 1, backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
    unitToggleRow: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    unitToggleBtn: { paddingHorizontal: 12, paddingVertical: 10 },
    unitToggleBtnActive: { backgroundColor: colors.primary },
    unitToggleText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
    unitToggleTextActive: { color: colors.onPrimary },
    weightSaveButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
    weightSaveButtonText: { color: colors.onPrimary, fontWeight: '800' },
    savedText: { color: colors.success, fontWeight: '700', fontSize: 12 },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    secondaryButton: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.chipBackground },
    secondaryButtonText: { color: colors.chipText, fontWeight: '800' },
    primaryButton: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primary },
    primaryButtonText: { color: colors.onPrimary, fontWeight: '800' },
  });
