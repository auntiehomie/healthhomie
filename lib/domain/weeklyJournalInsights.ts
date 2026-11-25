import { shiftDateKey } from './nutrition';
import type { DailyNutritionSummary, MealEntry, Note } from '@/types/healthhomie';
import type { HealthMetricsHistoryDay } from '@/lib/services/healthMetricsClient';

export type JournalInsight = { id: string; text: string; exposedDays: number; comparisonDays: number; delta: number };

/** A weekly, reproducible observational report. Unknown exposure is never treated as false. */
export function weeklyJournalInsights(input: {
  today: string; entries: MealEntry[]; nutrition: DailyNutritionSummary[];
  notes: Note[]; metrics: HealthMetricsHistoryDay[]; proteinTargetG: number;
}): { start: string; end: string; insights: JournalInsight[] } {
  const weekday = new Date(`${input.today}T12:00:00`).getDay();
  const end = shiftDateKey(input.today, -(weekday === 0 ? 7 : weekday));
  const start = shiftDateKey(end, -27);
  const nutrition = new Map(input.nutrition.map(day => [day.date, day]));
  const metrics = new Map(input.metrics.map(day => [day.date, day]));
  const insights: JournalInsight[] = [];
  const behaviors = [
    { id: 'late', label: 'eating at or after 9 pm', exposure(date: string) {
      const meals = input.entries.filter(e => e.date === date);
      if (!meals.length || meals.some(e => e.hour == null || !Number.isInteger(e.hour) || e.hour < 0 || e.hour > 23)) return null;
      return meals.some(e => e.hour! >= 21);
    } },
    { id: 'protein', label: 'meeting your protein target', exposure(date: string) {
      const day = nutrition.get(date);
      return day && day.entries > 0 && input.proteinTargetG > 0 ? day.proteinG >= input.proteinTargetG : null;
    } },
    { id: 'alcohol', label: 'notes tagged alcohol', exposure(date: string) {
      // Explicit positive/negative tags only; do not infer behaviors from free text or missing notes.
      const tags = input.notes.filter(n => {
        const d = new Date(n.createdAt);
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return local === date;
      }).flatMap(n => n.tags);
      const yes = tags.includes('alcohol');
      const no = tags.includes('no-alcohol');
      return yes === no ? null : yes;
    } },
  ];
  for (const behavior of behaviors) {
    for (const outcome of ['sleepScore', 'readinessScore'] as const) {
      const yes: number[] = [], no: number[] = [];
      for (let date = start; date < end; date = shiftDateKey(date, 1)) {
        const exposed = behavior.exposure(date);
        const score = metrics.get(shiftDateKey(date, 1))?.[outcome];
        if (exposed == null || score == null || !Number.isFinite(score) || score < 0 || score > 100) continue;
        (exposed ? yes : no).push(score);
      }
      if (yes.length < 4 || no.length < 4) continue;
      const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
      const delta = mean(yes) - mean(no);
      if (Math.abs(delta) < 5) continue;
      insights.push({ id: `${behavior.id}-${outcome}`, exposedDays: yes.length, comparisonDays: no.length, delta,
        text: `Next-day ${outcome === 'sleepScore' ? 'sleep' : 'readiness'} averaged ${Math.abs(delta).toFixed(0)} points ${delta > 0 ? 'higher' : 'lower'} after ${behavior.label} (${yes.length} vs ${no.length} logged days).` });
    }
  }
  return { start, end, insights };
}
