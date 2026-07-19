import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { MacroRing } from '@/components/health/MacroRing';
import { MetricCard } from '@/components/health/MetricCard';
import { getUserProfile, listFoodItems, listMealEntries } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { calculateDailyGoal } from '@/lib/domain/goals';
import { formatHour } from '@/lib/domain/mealType';
import { scaleMacros, summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { readTodayHealthSnapshot } from '@/lib/services/healthkit';
import { getLatestHealthSnapshot } from '@/lib/services/healthMetricsClient';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import type { DailyNutritionSummary, FoodItem, HealthSnapshot, MealEntry } from '@/types/healthhomie';

const FAT_COLOR = '#e2725a';

export default function TodayScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState<DailyNutritionSummary>({ date: todayKey(), entries: 0, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [goal, setGoal] = useState(calculateDailyGoal({ id: 'loading', goalType: 'improve-consistency', activityMultiplier: 1.2, createdAt: '', updatedAt: '' }));
  const [snapshot, setSnapshot] = useState<HealthSnapshot>({ date: todayKey() });
  const [todayFoods, setTodayFoods] = useState<FoodItem[]>([]);
  const [todayEntries, setTodayEntries] = useState<MealEntry[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      const [foods, entries, profile, localHealth, syncedHealth] = await Promise.all([
        listFoodItems(),
        listMealEntries(todayKey()),
        getUserProfile(),
        readTodayHealthSnapshot(),
        getLatestHealthSnapshot(),
      ]);
      if (!active) return;
      // Device-local HealthKit values (once wired) win when present; otherwise fall back to
      // whatever's synced server-side from a connected provider (Oura today, others later) —
      // this is how steps/active-kcal show up even for accounts with no Apple Health access.
      const health: HealthSnapshot = {
        date: localHealth.date,
        steps: localHealth.steps ?? syncedHealth.steps,
        activeEnergyKcal: localHealth.activeEnergyKcal ?? syncedHealth.activeEnergyKcal,
        weightKg: localHealth.weightKg ?? syncedHealth.weightKg,
        sleepMinutes: localHealth.sleepMinutes ?? syncedHealth.sleepMinutes,
        workouts: localHealth.workouts ?? syncedHealth.workouts,
      };
      setSnapshot(health);
      setSummary(summarizeDay(todayKey(), entries, foods));
      setGoal(calculateDailyGoal(profile, health));
      setTodayFoods(foods);
      setTodayEntries(entries.slice().sort((a, b) => (b.hour ?? -1) - (a.hour ?? -1)));
    }
    load().catch(console.warn);
    return () => { active = false; };
  }, []));

  const caloriesLeft = Math.round(goal.calories - summary.calories);

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>daily food + health loop</Text>
        <Text style={styles.title}>Hey homie, here’s today.</Text>
        <Text style={styles.subtitle}>Log the food. Watch the trend. Adjust gently.</Text>
      </View>

      <View style={styles.grid}>
        <MetricCard
          label="Calories left"
          value={`${caloriesLeft}`}
          helper={`${Math.round(summary.calories)} / ${Math.round(goal.calories)} kcal`}
          onPress={() => router.push('/(tabs)/journal')}
        />
        <MetricCard label="Food entries" value={`${summary.entries}`} helper="Consistency beats perfection" />
        <MetricCard label="Steps" value={snapshot.steps ? `${snapshot.steps}` : '—'} helper="From Oura, Apple Health, or another connected source" />
        <MetricCard label="Active kcal" value={snapshot.activeEnergyKcal ? `${Math.round(snapshot.activeEnergyKcal)}` : '—'} helper="Used to tune goals" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros</Text>
        <View style={styles.macroRow}>
          <MacroRing label="Protein" actual={summary.proteinG} target={goal.proteinTargetG} color={colors.primary} />
          <MacroRing label="Carbs" actual={summary.carbsG} target={goal.carbsG} color={colors.warning} />
          <MacroRing label="Fat" actual={summary.fatG} target={goal.fatG} color={FAT_COLOR} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s food</Text>
        {todayEntries.length === 0 ? (
          <Text style={styles.empty}>Nothing logged yet today.</Text>
        ) : (
          todayEntries.map((entry) => {
            const food = todayFoods.find((item) => item.id === entry.foodItemId);
            const macros = food ? scaleMacros(food, entry.servings) : null;
            return (
              <Pressable key={entry.id} style={styles.entryRow} onPress={() => router.push('/(tabs)/journal')}>
                <View style={styles.entryDetails}>
                  <Text style={styles.entryName}>{food ? foodDisplayName(food) : 'Food'}</Text>
                  <Text style={styles.entryMeta}>
                    {entry.hour != null ? formatHour(entry.hour) : entry.mealType} · {entry.servings} serving{entry.servings === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.entryKcal}>{macros ? Math.round(macros.calories) : 0} kcal</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 20, backgroundColor: colors.background },
    hero: { gap: 8, paddingTop: 10 },
    eyebrow: { color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    section: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    macroRow: { flexDirection: 'row', gap: 12 },
    empty: { color: colors.textMuted, fontStyle: 'italic' },
    entryRow: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    entryDetails: { flex: 1, gap: 2 },
    entryName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    entryMeta: { color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
    entryKcal: { color: colors.primary, fontWeight: '800' },
  });
