import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { getUserProfile, saveUserProfile } from '@/lib/db/database';
import { calculateDailyGoal, recommendWeeklyAdjustment } from '@/lib/domain/goals';
import { hapticSuccess } from '@/lib/utils/haptics';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
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
  const [editingCalories, setEditingCalories] = useState(false);
  const [calorieInput, setCalorieInput] = useState('');
  const [savingCalories, setSavingCalories] = useState(false);

  function reportError(title: string, message: string) {
    if (Platform.OS === 'web') window.alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  }

  const load = useCallback(async () => {
    const nextProfile = await getUserProfile();
    setProfile(nextProfile);
    setGoal(calculateDailyGoal(nextProfile));
  }, []);

  useFocusEffect(useCallback(() => { load().catch(console.warn); }, [load]));

  async function chooseGoal(goalType: GoalType) {
    if (!profile) return;
    const nextProfile = { ...profile, goalType, updatedAt: new Date().toISOString() };
    try {
      await saveUserProfile(nextProfile);
      setProfile(nextProfile);
      setGoal(calculateDailyGoal(nextProfile));
    } catch (err) {
      reportError('Couldn’t update goal', err instanceof Error ? err.message : 'Please try again.');
    }
  }

  function startEditingCalories() {
    setCalorieInput(String(Math.round(goal?.calories ?? 0)));
    setEditingCalories(true);
  }

  async function saveCalorieOverride() {
    if (!profile) return;
    const value = Number(calorieInput);
    if (!Number.isFinite(value) || value <= 0) {
      reportError('Invalid calorie target', 'Enter a number greater than 0.');
      return;
    }
    const nextProfile = { ...profile, calorieOverride: value, updatedAt: new Date().toISOString() };
    setSavingCalories(true);
    try {
      await saveUserProfile(nextProfile);
      hapticSuccess();
      setProfile(nextProfile);
      setGoal(calculateDailyGoal(nextProfile));
      setEditingCalories(false);
    } catch (err) {
      reportError('Couldn’t save calorie target', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingCalories(false);
    }
  }

  async function resetCalorieOverride() {
    if (!profile) return;
    const nextProfile = { ...profile, calorieOverride: undefined, updatedAt: new Date().toISOString() };
    setSavingCalories(true);
    try {
      await saveUserProfile(nextProfile);
      setProfile(nextProfile);
      setGoal(calculateDailyGoal(nextProfile));
      setEditingCalories(false);
    } catch (err) {
      reportError('Couldn’t reset calorie target', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingCalories(false);
    }
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
        {editingCalories ? (
          <View style={styles.editRow}>
            <TextInput
              value={calorieInput}
              onChangeText={setCalorieInput}
              keyboardType="number-pad"
              autoFocus
              style={styles.calorieInput}
            />
            <Text style={styles.editUnit}>kcal</Text>
          </View>
        ) : (
          <Pressable onPress={startEditingCalories}>
            <Text style={styles.big}>{Math.round(goal?.calories ?? 0)} kcal</Text>
          </Pressable>
        )}
        <Text style={styles.macro}>{Math.round(goal?.proteinTargetG ?? 0)}g protein · {Math.round(goal?.carbsG ?? 0)}g carbs · {Math.round(goal?.fatG ?? 0)}g fat</Text>
        <Text style={styles.disclaimer}>Estimates based on general sports-nutrition research (e.g. ISSN protein guidance). Not medical or dietitian advice — check with a professional for your specific needs.</Text>
        {editingCalories ? (
          <View style={styles.editActions}>
            <Pressable style={styles.editButton} onPress={() => setEditingCalories(false)} disabled={savingCalories}>
              <Text style={styles.editButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.editButton, styles.editButtonPrimary]} onPress={saveCalorieOverride} disabled={savingCalories}>
              <Text style={styles.editButtonTextPrimary}>{savingCalories ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={profile?.calorieOverride ? resetCalorieOverride : startEditingCalories}>
            <Text style={styles.editLink}>
              {profile?.calorieOverride ? 'Manually set · tap to reset to calculated' : 'Tap to edit'}
            </Text>
          </Pressable>
        )}
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
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 8 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    big: { fontSize: 40, fontWeight: '900', color: colors.primary },
    macro: { color: colors.textMuted },
    disclaimer: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 4 },
    editRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    calorieInput: { fontSize: 40, fontWeight: '900', color: colors.primary, minWidth: 120, padding: 0 },
    editUnit: { fontSize: 20, fontWeight: '700', color: colors.textMuted },
    editLink: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 2 },
    editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    editButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.chipBackground },
    editButtonPrimary: { backgroundColor: colors.primary },
    editButtonText: { color: colors.chipText, fontWeight: '800' },
    editButtonTextPrimary: { color: colors.onPrimary, fontWeight: '800' },
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
