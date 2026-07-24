import type { FoodItem, MealEntry } from '@/types/healthhomie';

const HOUR_WINDOW = 2; // "around this time" = within this many hours either direction
const HALF_LIFE_DAYS = 30; // a log from 30 days ago counts half as much as one from today
const MIN_OCCURRENCES = 2; // one old log isn't a pattern - needs to have happened more than once

function hourDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 - diff);
}

function daysAgo(iso: string, from: Date): number {
  return Math.max(0, (from.getTime() - new Date(iso).getTime()) / 86400000);
}

export type SuggestedFood = { food: FoodItem; occurrences: number };

/** Ranks previously-logged foods by how often (recency-weighted) the user has actually logged
 * them around this same hour of day - the closest thing to "the app learning what works for you"
 * without needing a model: real logging history, weighted toward recent and time-relevant
 * patterns, is the signal. Foods already logged today are excluded since suggesting them again is
 * redundant. */
export function suggestFoodsForHour(params: {
  allEntries: MealEntry[];
  foods: FoodItem[];
  hour: number;
  todayFoodItemIds: ReadonlySet<string>;
  limit?: number;
  now?: Date;
}): SuggestedFood[] {
  const { allEntries, foods, hour, todayFoodItemIds, limit = 3, now = new Date() } = params;
  const byId = new Map(foods.map((f) => [f.id, f]));
  const agg = new Map<string, { score: number; occurrences: number }>();

  for (const entry of allEntries) {
    if (todayFoodItemIds.has(entry.foodItemId)) continue;
    if (!byId.has(entry.foodItemId)) continue;
    const entryHour = entry.hour ?? 12;
    const distance = hourDistance(entryHour, hour);
    if (distance > HOUR_WINDOW) continue;

    const recencyWeight = Math.pow(0.5, daysAgo(entry.createdAt, now) / HALF_LIFE_DAYS);
    const proximityWeight = 1 - distance / (HOUR_WINDOW + 1);
    const current = agg.get(entry.foodItemId) ?? { score: 0, occurrences: 0 };
    current.score += recencyWeight * proximityWeight;
    current.occurrences += 1;
    agg.set(entry.foodItemId, current);
  }

  return Array.from(agg.entries())
    .filter(([, v]) => v.occurrences >= MIN_OCCURRENCES)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id, v]) => ({ food: byId.get(id)!, occurrences: v.occurrences }));
}
