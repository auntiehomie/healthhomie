import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { MacroRing } from '@/components/health/MacroRing';
import { MetricCard } from '@/components/health/MetricCard';
import { CalendarStrip, type DayCompliance } from '@/components/health/CalendarStrip';
import {
  getUserProfile,
  listFoodItems,
  listMealEntries,
  getWeightHistory,
  logWeight,
  listExercises,
} from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { calculateDailyGoal } from '@/lib/domain/goals';
import { formatHour } from '@/lib/domain/mealType';
import { scaleMacros, shiftDateKey, summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { readTodayHealthSnapshot } from '@/lib/services/healthkit';
import { getLatestHealthSnapshot } from '@/lib/services/healthMetricsClient';
import { getOuraStatus, connectOura } from '@/lib/services/ouraClient';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { cardShadow } from '@/lib/theme/shadow';
import type { DailyNutritionSummary, FoodItem, HealthSnapshot, MealEntry, WeightLog } from '@/types/healthhomie';

const FAT_COLOR = '#e2725a';

export default function TodayScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [summary, setSummary] = useState<DailyNutritionSummary>({ date: todayKey(), entries: 0, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  const [goal, setGoal] = useState(calculateDailyGoal({ id: 'loading', goalType: 'improve-consistency', activityMultiplier: 1.2, createdAt: '', updatedAt: '' }));
  const [snapshot, setSnapshot] = useState<HealthSnapshot>({ date: todayKey() });
  const [todayFoods, setTodayFoods] = useState<FoodItem[]>([]);
  const [todayEntries, setTodayEntries] = useState<MealEntry[]>([]);
  const [ouraNeedsReconnect, setOuraNeedsReconnect] = useState(false);
  const [reconnectingOura, setReconnectingOura] = useState(false);

  // Calendar compliance data
  const [calendarDays, setCalendarDays] = useState<DayCompliance[]>([]);

  // Weight tracking
  const [latestWeight, setLatestWeight] = useState<WeightLog | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lb' | 'kg'>('lb');
  const [savingWeight, setSavingWeight] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      const health: HealthSnapshot = {
        date: localHealth.date,
        steps: localHealth.steps ?? syncedHealth.steps,
        activeEnergyKcal: localHealth.activeEnergyKcal ?? syncedHealth.activeEnergyKcal,
        weightKg: localHealth.weightKg ?? syncedHealth.weightKg,
        sleepMinutes: localHealth.sleepMinutes ?? syncedHealth.sleepMinutes,
        workouts: localHealth.workouts ?? syncedHealth.workouts,
      };
      setSnapshot(health);

      const ouraStatus = await getOuraStatus().catch(() => ({ connected: false }));
      const hasNoProviderData = syncedHealth.steps == null && syncedHealth.activeEnergyKcal == null;
      setOuraNeedsReconnect(ouraStatus.connected && hasNoProviderData);
      setSummary(summarizeDay(todayKey(), entries, foods));
      setGoal(calculateDailyGoal(profile, health));
      setTodayFoods(foods);
      setTodayEntries(entries.slice().sort((a, b) => (b.hour ?? -1) - (a.hour ?? -1)));

      // Load calendar strip data (30 days of entries for compliance indicators)
      Promise.all([
        listMealEntries(),
        listExercises(),
        getWeightHistory(30),
      ]).then(([allEntries, exerciseEntries, weights]) => {
        if (!active) return
        const dates = Array.from({ length: 30 }, (_, i) => shiftDateKey(todayKey(), -i)).reverse()
        const foodDates = new Set(allEntries.map((e) => e.date))
        const exerciseDates = new Set(exerciseEntries.map((e) => e.date))
        const weightDates = new Set(weights.map((w) => w.date))
        setCalendarDays(
          dates.map((d) => ({
            date: d,
            indicators: [
              ...(foodDates.has(d) ? ['food' as const] : []),
              ...(exerciseDates.has(d) ? ['exercise' as const] : []),
              ...(weightDates.has(d) ? ['weight' as const] : []),
            ],
          }))
        )
        setLatestWeight(weights[0] ?? null)
      }).catch(console.warn)
    }
    load().catch(console.warn)
    return () => { active = false }
  }, []))

  const caloriesLeft = Math.round(goal.calories - summary.calories)

  async function handleReconnectOura() {
    setReconnectingOura(true)
    try {
      await connectOura()
      setOuraNeedsReconnect(false)
    } catch {
      // If reconnection fails, keep the banner visible
    } finally {
      setReconnectingOura(false)
    }
  }

  const KG_PER_LB = 0.45359237
  const kgToLb = (kg: number) => kg / KG_PER_LB
  const lbToKg = (lb: number) => lb * KG_PER_LB

  function toggleWeightUnit(next: 'lb' | 'kg') {
    if (next === weightUnit) return
    const value = parseFloat(weightInput)
    if (Number.isFinite(value) && value > 0) {
      const converted = next === 'kg' ? lbToKg(value) : kgToLb(value)
      setWeightInput(String(Math.round(converted * 10) / 10))
    }
    setWeightUnit(next)
  }

  async function handleSaveWeight() {
    const rawValue = parseFloat(weightInput)
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      if (Platform.OS === 'web') window.alert(`Enter a valid weight in ${weightUnit}.`)
      else Alert.alert('Invalid weight', `Enter a valid weight in ${weightUnit}.`)
      return
    }
    const kg = weightUnit === 'lb' ? lbToKg(rawValue) : rawValue
    if (kg > 300) {
      if (Platform.OS === 'web') window.alert('That value seems too high — check the unit toggle.')
      else Alert.alert('Value too high', 'That value seems too high — check the unit toggle (lb vs kg).')
      return
    }
    setSavingWeight(true)
    try {
      const entry = await logWeight(todayKey(), Math.round(kg * 10) / 10)
      setLatestWeight(entry)
      setWeightInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.'
      if (Platform.OS === 'web') window.alert(`Failed to save weight: ${msg}`)
      else Alert.alert('Save failed', msg)
    } finally {
      setSavingWeight(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      let active = true
      const [foods, entries] = await Promise.all([
        listFoodItems(),
        listMealEntries(todayKey()),
      ])
      if (!active) return
      setTodayFoods(foods)
      setTodayEntries(entries.slice().sort((a, b) => (b.hour ?? -1) - (a.hour ?? -1)))
      setSummary(summarizeDay(todayKey(), entries, foods))
    } finally {
      setRefreshing(false)
    }
  }, [])

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* Calendar strip */}
      {calendarDays.length > 0 ? (
        <CalendarStrip
          days={calendarDays}
          onDayPress={(date) => router.push({ pathname: '/(tabs)/journal', params: { date } })}
          currentDate={todayKey()}
        />
      ) : null}

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>daily food + health loop</Text>
        <Text style={styles.title}>Hey homie, here&apos;s today.</Text>
        <Text style={styles.subtitle}>Log the food. Watch the trend. Adjust gently.</Text>
      </View>

      {ouraNeedsReconnect && (
        <Pressable
          style={[styles.ouraWarning, reconnectingOura && { opacity: 0.6 }]}
          onPress={handleReconnectOura}
          disabled={reconnectingOura}
        >
          <Text style={styles.ouraWarningTitle}>Oura connection needs attention</Text>
          <Text style={styles.ouraWarningText}>
            Your Oura access token has expired. Tap here to reconnect and restore your daily health data.
          </Text>
          <Text style={styles.ouraWarningAction}>{reconnectingOura ? 'Connecting…' : 'Reconnect Oura →'}</Text>
        </Pressable>
      )}

      {/* Weight card */}
      <View style={styles.weightCard}>
        <Text style={styles.sectionTitle}>Weight</Text>
        {latestWeight ? (
          <View style={styles.weightValueRow}>
            <Text style={styles.weightValue}>{weightUnit === 'lb' ? Math.round(kgToLb(latestWeight.weightKg) * 10) / 10 : latestWeight.weightKg} {weightUnit}</Text>
            <Text style={styles.weightDate}>logged {latestWeight.date}</Text>
          </View>
        ) : (
          <Text style={styles.empty}>No weight logged yet.</Text>
        )}
        <View style={styles.weightInputRow}>
          <TextInput
            style={styles.weightInput}
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder={`Weight in ${weightUnit}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <View style={styles.unitToggleRow}>
            <Pressable onPress={() => toggleWeightUnit('lb')} style={[styles.unitToggleBtn, weightUnit === 'lb' && styles.unitToggleBtnActive]}>
              <Text style={[styles.unitToggleText, weightUnit === 'lb' && styles.unitToggleTextActive]}>lb</Text>
            </Pressable>
            <Pressable onPress={() => toggleWeightUnit('kg')} style={[styles.unitToggleBtn, weightUnit === 'kg' && styles.unitToggleBtnActive]}>
              <Text style={[styles.unitToggleText, weightUnit === 'kg' && styles.unitToggleTextActive]}>kg</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.weightSaveBtn, savingWeight && { opacity: 0.5 }]}
            onPress={() => void handleSaveWeight()}
            disabled={savingWeight || !weightInput.trim()}
          >
            <Text style={styles.weightSaveBtnText}>{savingWeight ? '…' : 'Log'}</Text>
          </Pressable>
        </View>
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
            const food = todayFoods.find((item) => item.id === entry.foodItemId)
            const macros = food ? scaleMacros(food, entry.servings) : null
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
            )
          })
        )}
      </View>
    </ScrollView>
  )
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
    // Oura reconnection banner
    ouraWarning: { backgroundColor: colors.warning + '1A', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.warning, gap: 6 },
    ouraWarningTitle: { color: colors.warning, fontWeight: '800', fontSize: 16 },
    ouraWarningText: { color: colors.textMuted, lineHeight: 20 },
    ouraWarningAction: { color: colors.primary, fontWeight: '800', marginTop: 4 },
    // Weight card
    weightCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      ...cardShadow,
    },
    weightValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    weightValue: { fontSize: 28, fontWeight: '900', color: colors.text },
    weightDate: { color: colors.textMuted, fontSize: 13 },
    weightInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    weightInput: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    unitToggleRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 12, overflow: 'hidden' },
    unitToggleBtn: { paddingHorizontal: 10, paddingVertical: 12 },
    unitToggleBtnActive: { backgroundColor: colors.primary },
    unitToggleText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
    unitToggleTextActive: { color: colors.onPrimary },
    weightSaveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    weightSaveBtnText: { color: colors.onPrimary, fontWeight: '800' },
    // Food entries
    entryRow: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    entryDetails: { flex: 1, gap: 2 },
    entryName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    entryMeta: { color: colors.textMuted, fontSize: 12, textTransform: 'capitalize' },
    entryKcal: { color: colors.primary, fontWeight: '800' },
  })