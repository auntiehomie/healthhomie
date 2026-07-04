import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MacroRing } from '@/components/health/MacroRing';
import { MetricCard } from '@/components/health/MetricCard';
import { getUserProfile, listFoodItems, listMealEntries } from '@/lib/db/database';
import { calculateDailyGoal } from '@/lib/domain/goals';
import { summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { readTodayHealthSnapshot } from '@/lib/services/healthkit';
import type { DailyNutritionSummary, HealthSnapshot } from '@/types/healthhomie';

export default function TodayScreen() {
  const [summary, setSummary] = useState<DailyNutritionSummary>({ date: todayKey(), entries: 0, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [goal, setGoal] = useState(calculateDailyGoal({ id: 'loading', goalType: 'improve-consistency', activityMultiplier: 1.2, createdAt: '', updatedAt: '' }));
  const [snapshot, setSnapshot] = useState<HealthSnapshot>({ date: todayKey() });

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      const [foods, entries, profile, health] = await Promise.all([listFoodItems(), listMealEntries(todayKey()), getUserProfile(), readTodayHealthSnapshot()]);
      if (!active) return;
      setSnapshot(health);
      setSummary(summarizeDay(todayKey(), entries, foods));
      setGoal(calculateDailyGoal(profile, health));
    }
    load().catch(console.warn);
    return () => { active = false; };
  }, []));

  const caloriesLeft = Math.round(goal.calories - summary.calories);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>daily food + health loop</Text>
        <Text style={styles.title}>Hey homie, here’s today.</Text>
        <Text style={styles.subtitle}>Log the food. Watch the trend. Adjust gently.</Text>
      </View>

      <View style={styles.grid}>
        <MetricCard label="Calories left" value={`${caloriesLeft}`} helper={`${Math.round(summary.calories)} / ${Math.round(goal.calories)} kcal`} />
        <MetricCard label="Food entries" value={`${summary.entries}`} helper="Consistency beats perfection" />
        <MetricCard label="Steps" value={snapshot.steps ? `${snapshot.steps}` : '—'} helper="Apple Health once enabled" />
        <MetricCard label="Active kcal" value={snapshot.activeEnergyKcal ? `${Math.round(snapshot.activeEnergyKcal)}` : '—'} helper="Used to tune goals" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macros</Text>
        <View style={styles.macroRow}>
          <MacroRing label="Protein" actual={summary.proteinG} target={goal.proteinTargetG} color="#4f7c59" />
          <MacroRing label="Carbs" actual={summary.carbsG} target={goal.carbsG} color="#d0903f" />
          <MacroRing label="Fat" actual={summary.fatG} target={goal.fatG} color="#7a6ee6" />
        </View>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteTitle}>Next smart build</Text>
        <Text style={styles.noteText}>Manual logging is local-first. USDA search, barcode lookup, HealthKit reads, and weekly goal adjustments are isolated behind service boundaries so we can add them without rewriting screens.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20, backgroundColor: '#fffaf2' },
  hero: { gap: 8, paddingTop: 10 },
  eyebrow: { color: '#4f7c59', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 34, lineHeight: 38, fontWeight: '900', color: '#211d18' },
  subtitle: { color: '#665f54', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  section: { backgroundColor: '#ffffff', borderRadius: 24, padding: 18, gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#211d18' },
  macroRow: { flexDirection: 'row', gap: 12 },
  note: { padding: 18, backgroundColor: '#edf5ee', borderRadius: 24, gap: 8 },
  noteTitle: { fontSize: 18, fontWeight: '800', color: '#234229' },
  noteText: { color: '#38513d', lineHeight: 20 },
});
