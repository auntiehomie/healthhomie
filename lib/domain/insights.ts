import type { DailyProductivityLog } from '@/lib/db/dailyLogStorage';
import type { HealthMetricsHistoryDay } from '@/lib/services/healthMetricsClient';
import type { DailyNutritionSummary, Mood } from '@/types/healthhomie';

const MOOD_SCORE: Record<Mood, number> = { stressed: 1, tired: 2, meh: 3, good: 4, great: 5 };

// Rule-based, not statistical significance testing - this is a personal-use app, not a clinical
// study. These thresholds exist purely to stop a 1-vs-1-day "pattern" from being presented as if
// it means something; they're a floor, not a claim of rigor.
const MIN_GROUP_DAYS = 4;
const MIN_MOOD_DELTA = 0.4; // out of a 1-5 scale
const MIN_READINESS_DELTA = 5; // Oura/Fitbit readiness is roughly 0-100

export type Insight = { id: string; text: string };

function averageMoodScore(moods: Mood[]): number | null {
  if (moods.length === 0) return null;
  return moods.reduce((sum, m) => sum + MOOD_SCORE[m], 0) / moods.length;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Combines nutrition (server), mood/routine (device-local), and readiness (server, if a health
 * provider is connected) history into a handful of plain-language observations - "on days you did
 * X, Y tended to be different." Each comparison needs a real sample on both sides and a real gap
 * between them before it's surfaced, so this stays honest about what it actually knows versus a
 * coincidence in a handful of days. */
export function computeCorrelationInsights(params: {
  nutrition: DailyNutritionSummary[];
  proteinTargetG: number;
  productivity: DailyProductivityLog[];
  readiness: HealthMetricsHistoryDay[];
  routineTemplateLength: number;
}): Insight[] {
  const { nutrition, proteinTargetG, productivity, readiness, routineTemplateLength } = params;
  const insights: Insight[] = [];

  const nutritionByDate = new Map(nutrition.map((n) => [n.date, n]));
  const productivityByDate = new Map(productivity.map((p) => [p.date, p]));
  const readinessByDate = new Map(readiness.map((r) => [r.date, r]));

  // 1. Protein target hit vs. mood
  {
    const hit: number[] = [];
    const missed: number[] = [];
    for (const [date, prod] of productivityByDate) {
      const moodScore = averageMoodScore(prod.moods);
      const day = nutritionByDate.get(date);
      if (moodScore == null || !day || day.entries === 0) continue;
      (day.proteinG >= proteinTargetG * 0.9 ? hit : missed).push(moodScore);
    }
    const hitAvg = average(hit);
    const missedAvg = average(missed);
    if (hit.length >= MIN_GROUP_DAYS && missed.length >= MIN_GROUP_DAYS && hitAvg != null && missedAvg != null) {
      const delta = hitAvg - missedAvg;
      if (Math.abs(delta) >= MIN_MOOD_DELTA) {
        insights.push({
          id: 'protein-mood',
          text: `Your mood tends to run ${delta > 0 ? 'higher' : 'lower'} on days you hit your protein target (${hitAvg.toFixed(1)}/5 vs ${missedAvg.toFixed(1)}/5).`,
        });
      }
    }
  }

  // 2. Morning routine completion vs. mood
  if (routineTemplateLength > 0) {
    const done: number[] = [];
    const notDone: number[] = [];
    for (const prod of productivityByDate.values()) {
      const moodScore = averageMoodScore(prod.moods);
      if (moodScore == null) continue;
      (prod.routineCompletedCount >= routineTemplateLength ? done : notDone).push(moodScore);
    }
    const doneAvg = average(done);
    const notDoneAvg = average(notDone);
    if (done.length >= MIN_GROUP_DAYS && notDone.length >= MIN_GROUP_DAYS && doneAvg != null && notDoneAvg != null) {
      const delta = doneAvg - notDoneAvg;
      if (Math.abs(delta) >= MIN_MOOD_DELTA) {
        insights.push({
          id: 'routine-mood',
          text: `Your mood averages ${doneAvg.toFixed(1)}/5 on days you finish your morning routine, vs ${notDoneAvg.toFixed(1)}/5 on days you don't.`,
        });
      }
    }
  }

  // 3. Morning routine completion vs. readiness (only meaningful with a connected health provider)
  if (routineTemplateLength > 0 && readinessByDate.size > 0) {
    const done: number[] = [];
    const notDone: number[] = [];
    for (const [date, prod] of productivityByDate) {
      const readinessScore = readinessByDate.get(date)?.readinessScore;
      if (readinessScore == null) continue;
      (prod.routineCompletedCount >= routineTemplateLength ? done : notDone).push(readinessScore);
    }
    const doneAvg = average(done);
    const notDoneAvg = average(notDone);
    if (done.length >= MIN_GROUP_DAYS && notDone.length >= MIN_GROUP_DAYS && doneAvg != null && notDoneAvg != null) {
      const delta = doneAvg - notDoneAvg;
      if (Math.abs(delta) >= MIN_READINESS_DELTA) {
        insights.push({
          id: 'routine-readiness',
          text: `Readiness averages ${Math.round(doneAvg)} on days you finish your morning routine, vs ${Math.round(notDoneAvg)} on days you don't.`,
        });
      }
    }
  }

  return insights;
}
