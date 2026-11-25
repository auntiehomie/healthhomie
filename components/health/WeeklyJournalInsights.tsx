import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { listFoodItems, listMealEntries, getUserProfile } from '@/lib/db/database';
import { loadNotes } from '@/lib/db/notesStorage';
import { calculateDailyGoal } from '@/lib/domain/goals';
import { summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { weeklyJournalInsights } from '@/lib/domain/weeklyJournalInsights';
import { getHealthMetricsHistory } from '@/lib/services/healthMetricsClient';
import { useTheme } from '@/lib/theme/ThemeContext';

export function WeeklyJournalInsights() {
  const { colors } = useTheme();
  const [report, setReport] = useState<ReturnType<typeof weeklyJournalInsights> | null>(null);
  const [error, setError] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([listFoodItems(), listMealEntries(), getUserProfile(), loadNotes(), getHealthMetricsHistory(40)])
      .then(([foods, entries, profile, notes, metrics]) => {
        const nutrition = [...new Set(entries.map(e => e.date))].map(date => summarizeDay(date, entries, foods));
        const result = weeklyJournalInsights({ today: todayKey(), entries, nutrition, notes, metrics, proteinTargetG: calculateDailyGoal(profile).proteinTargetG });
        if (active) { setReport(result); setError(false); }
      }).catch(() => { if (active) { setError(true); setReport(null); } });
    return () => { active = false; };
  }, []));
  return <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 20, gap: 8 }}>
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17 }}>Weekly journal → outcomes</Text>
    <Text style={{ color: colors.textMuted }}>{error ? 'Could not load insights. Reopen Trends to retry.' : report ? `28-day evidence window: ${report.start} – ${report.end}. Updated weekly.` : 'Loading weekly insights…'}</Text>
    {report?.insights.map(insight => <Text key={insight.id} style={{ color: colors.text }}>{insight.text}</Text>)}
    {report && !report.insights.length && <Text style={{ color: colors.text }}>Not enough comparable data yet. Each comparison needs 4 days per group and a 5-point difference.</Text>}
    <Text style={{ color: colors.textMuted }}>Patterns, not causes or medical advice. Only logged meals count; unknown times are excluded. Tag notes alcohol or no-alcohol for explicit journal comparisons. Health scores come from your connected providers (including Oura).</Text>
  </View>;
}
