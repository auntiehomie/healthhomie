import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { getUserProfile, saveUserProfile } from '@/lib/db/database';
import { calculateDailyGoal, recommendWeeklyAdjustment } from '@/lib/domain/goals';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { GoalType, NutritionGoal, UserProfile } from '@/types/healthhomie';

const goalTypes: { key: GoalType; label: string; helper: string }[] = [
  { key: 'lose-weight', label: 'Lose weight', helper: 'small calorie deficit, protein-forward' },
  { key: 'maintain', label: 'Maintain', helper: 'stability and energy balance' },
  { key: 'gain-muscle', label: 'Gain muscle', helper: 'protein + small surplus' },
  { key: 'improve-consistency', label: 'Consistency', helper: 'log first, optimize later' },
];

export default function GoalsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 14, backgroundColor: colors.background },
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 8 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    big: { fontSize: 40, fontWeight: '900', color: colors.primary },
    macro: { color: colors.textMuted },
    label: { color: colors.text, fontWeight: '800', marginTop: 8 },
    goalRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16 },
    goalRowActive: { backgroundColor: colors.primary },
    goalLabel: { fontSize: 17, fontWeight: '800', color: colors.text },
    goalHelper: { marginTop: 3, color: colors.textMuted },
    goalLabelActive: { color: colors.onPrimary },
    goalHelperActive: { color: colors.onPrimary, opacity: 0.85 },
    insight: { backgroundColor: colors.surfaceAlt, borderRadius: 24, padding: 18, gap: 8 },
    insightText: { color: colors.text, lineHeight: 20 },
    insightDelta: { color: colors.text, fontWeight: '800' },
  });
