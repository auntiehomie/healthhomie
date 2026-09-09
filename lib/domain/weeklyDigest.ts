import { addMacros, emptyMacros, scaleMacros } from "./nutrition";
import type { FoodItem, MealEntry } from "@/types/healthhomie";
import type { DailyProductivityLog } from "@/lib/db/dailyLogStorage";

export type WeeklyDigest = {
  start: string;
  end: string;
  daysLogged: number;
  avgCalories: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  avgMood: string | null;
  avgWaterGlasses: number;
  routinePct: number;
};

const MOOD_ORDER = ["stressed", "tired", "meh", "good", "great"] as const;

export function compileWeeklyDigest(
  start: string,
  end: string,
  entries: MealEntry[],
  foods: FoodItem[],
  logs: DailyProductivityLog[],
): WeeklyDigest {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${start}T00:00:00`);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const byId = new Map(foods.map((food) => [food.id, food]));
  let totals = emptyMacros();
  const daysLogged = dates.filter((date) =>
    entries.some((entry) => entry.date === date),
  ).length;
  for (const entry of entries) {
    const food = byId.get(entry.foodItemId);
    if (food && dates.includes(entry.date))
      totals = addMacros(totals, scaleMacros(food, entry.servings));
  }
  const moods = logs
    .flatMap((log) => log.moods)
    .map((mood) => MOOD_ORDER.indexOf(mood as (typeof MOOD_ORDER)[number]) + 1)
    .filter((score) => score > 0);
  const moodScore = moods.length
    ? Math.round(moods.reduce((sum, score) => sum + score, 0) / moods.length)
    : 0;
  return {
    start,
    end,
    daysLogged,
    avgCalories: Math.round(totals.calories / 7),
    avgProteinG: Math.round(totals.proteinG / 7),
    avgCarbsG: Math.round(totals.carbsG / 7),
    avgFatG: Math.round(totals.fatG / 7),
    avgMood: moodScore ? MOOD_ORDER[moodScore - 1] : null,
    avgWaterGlasses:
      Math.round(
        (logs.reduce((sum, log) => sum + log.waterGlasses, 0) / 7) * 10,
      ) / 10,
    routinePct: Math.round(
      (logs.filter((log) => log.routineCompletedCount > 0).length / 7) * 100,
    ),
  };
}

export function weeklyDigestEmailHtml(digest: WeeklyDigest): string {
  return `<h1>Your Howdy Morning weekly review</h1><p>${digest.start} – ${digest.end}</p><h2>Nutrition</h2><ul><li>${digest.avgCalories} kcal/day average</li><li>${digest.avgProteinG}g protein/day</li><li>${digest.avgCarbsG}g carbs/day</li><li>${digest.avgFatG}g fat/day</li><li>Logged ${digest.daysLogged} of 7 days</li></ul><h2>Energy & habits</h2><ul><li>Average mood: ${digest.avgMood ?? "No data"}</li><li>${digest.avgWaterGlasses} glasses of water/day</li><li>${digest.routinePct}% of days with a completed routine</li></ul><p>Keep the next week simple: notice what helps your energy and build from there.</p>`;
}
