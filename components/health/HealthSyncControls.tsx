import { useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { getUserProfile, listFoodItems, listMealEntries } from '@/lib/db/database';
import { summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { readTodayHealthSnapshot, requestHealthPermissions, writeNutritionTotals } from '@/lib/services/healthkit';
import { GARMIN_SYNC_CAPABILITIES } from '@/lib/services/garminAdapter';
import { useTheme } from '@/lib/theme/ThemeContext';

export function HealthSyncControls() {
  const { colors } = useTheme();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  async function run(exportNutrition: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const permission = await requestHealthPermissions(exportNutrition);
      if (!permission.granted) throw new Error(permission.reason ?? 'Apple Health is unavailable.');
      if (exportNutrition) {
        const date = todayKey();
        const [profile, foods, entries] = await Promise.all([getUserProfile(), listFoodItems(), listMealEntries(date)]);
        const totals = summarizeDay(date, entries, foods);
        if (!totals.entries) throw new Error('Log food before exporting nutrition.');
        const count = await writeNutritionTotals(profile.id, totals);
        setStatus(`Apple Health saved ${count} daily nutrition totals for ${date}. Re-export after journal edits. Exports replace this app’s previous totals, not other apps’ data.`);
      } else {
        const snapshot = await readTodayHealthSnapshot();
        setStatus(`${snapshot.date}: ${snapshot.steps ?? 'Unknown'} steps · ${snapshot.activeEnergyKcal ?? 'Unknown'} active kcal · ${snapshot.weightKg ?? 'Unknown'} kg (today). Device preview only; not uploaded. Missing data may mean no samples or denied read access.`);
      }
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Health sync failed.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <View style={{ gap: 10 }}>
    <Text style={{ color: colors.text }}>Manual sync groundwork</Text>
    <Text style={{ color: colors.textMuted }}>Reads today’s steps, active energy, and weight on this iPhone. Export sends journal calories, protein, carbohydrates, and fat to Apple Health only when you choose. No background sync, sleep/workout import, or cloud upload yet.</Text>
    {Platform.OS === 'ios' ? <>
      <Pressable disabled={busy} onPress={() => void run(false)}><Text style={{ color: colors.primary }}>{busy ? 'Working…' : 'Preview today’s Apple Health data'}</Text></Pressable>
      <Pressable disabled={busy} onPress={() => void run(true)}><Text style={{ color: colors.primary }}>Allow & export today’s nutrition to Apple Health</Text></Pressable>
    </> : <Text style={{ color: colors.textMuted }}>Apple Health sync requires an iOS development/production build, not web or Expo Go.</Text>}
    {!!status && <Text accessibilityRole="alert" style={{ color: colors.text }}>{status}</Text>}
    <Text style={{ color: colors.text }}>Garmin: groundwork only</Text>
    <Text style={{ color: colors.textMuted }}>{GARMIN_SYNC_CAPABILITIES.reason}</Text>
  </View>;
}
