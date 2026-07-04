import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getUserProfile, saveUserProfile } from '@/lib/db/database';
import { calculateDailyGoal, recommendWeeklyAdjustment } from '@/lib/domain/goals';
import type { GoalType, NutritionGoal, UserProfile } from '@/types/healthhomie';

const goalTypes: { key: GoalType; label: string; helper: string }[] = [
  { key: 'lose-weight', label: 'Lose weight', helper: 'small calorie deficit, protein-forward' },
  { key: 'maintain', label: 'Maintain', helper: 'stability and energy balance' },
  { key: 'gain-muscle', label: 'Gain muscle', helper: 'protein + small surplus' },
  { key: 'improve-consistency', label: 'Consistency', helper: 'log first, optimize later' },
];

export default function GoalsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);

  const load = useCallback(async () => {
    const nextProfile = await getUserProfile();
    setProfile(nextProfile);
    setGoal(calculateDailyGoal(nextProfile));
  }, []);

  useFocusEffect(useCallback(() => { load().catch(console.warn); }, [load]));

  async function chooseGoal(goalType: GoalType) {
    if (!profile) return;
    const nextProfile = { ...profile, goalType, updatedAt: new Date().toISOString() };
    await saveUserProfile(nextProfile);
    setProfile(nextProfile);
    setGoal(calculateDailyGoal(nextProfile));
  }

  const sampleInsight = goal ? recommendWeeklyAdjustment({
    goal,
    checkIn: { weekStart: 'preview', averageCalories: goal.calories - 50, averageProteinG: goal.proteinTargetG * 0.92, averageWeightKg: profile?.currentWeightKg, adherencePct: 82 },
  }) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Goals</Text>
      <Text style={styles.subtitle}>Healthhomie goals use Apple Health context when available, but stay boring-on-purpose: calories, protein, trend, consistency.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current target</Text>
        <Text style={styles.big}>{Math.round(goal?.calories ?? 0)} kcal</Text>
        <Text style={styles.macro}>{Math.round(goal?.proteinTargetG ?? 0)}g protein · {Math.round(goal?.carbsG ?? 0)}g carbs · {Math.round(goal?.fatG ?? 0)}g fat</Text>
      </View>

      <Text style={styles.label}>Choose direction</Text>
      {goalTypes.map((item) => (
        <Pressable key={item.key} onPress={() => chooseGoal(item.key)} style={[styles.goalRow, profile?.goalType === item.key && styles.goalRowActive]}>
          <View>
            <Text style={[styles.goalLabel, profile?.goalType === item.key && styles.goalLabelActive]}>{item.label}</Text>
            <Text style={[styles.goalHelper, profile?.goalType === item.key && styles.goalHelperActive]}>{item.helper}</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.insight}>
        <Text style={styles.cardTitle}>Weekly check-in preview</Text>
        <Text style={styles.insightText}>{sampleInsight?.insight}</Text>
        <Text style={styles.insightDelta}>Suggested delta: {sampleInsight?.recommendedCalorieDelta ?? 0} kcal</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, backgroundColor: '#fffaf2' },
  title: { fontSize: 32, fontWeight: '900', color: '#211d18' },
  subtitle: { color: '#665f54', lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 18, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#211d18' },
  big: { fontSize: 40, fontWeight: '900', color: '#4f7c59' },
  macro: { color: '#665f54' },
  label: { color: '#211d18', fontWeight: '800', marginTop: 8 },
  goalRow: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16 },
  goalRowActive: { backgroundColor: '#4f7c59' },
  goalLabel: { fontSize: 17, fontWeight: '800', color: '#211d18' },
  goalHelper: { marginTop: 3, color: '#7a7165' },
  goalLabelActive: { color: '#fffaf2' },
  goalHelperActive: { color: '#e5eadf' },
  insight: { backgroundColor: '#edf5ee', borderRadius: 24, padding: 18, gap: 8 },
  insightText: { color: '#38513d', lineHeight: 20 },
  insightDelta: { color: '#234229', fontWeight: '800' },
});
