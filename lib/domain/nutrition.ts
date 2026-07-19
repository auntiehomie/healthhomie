import type { DailyNutritionSummary, FoodItem, MacroNutrients, MealEntry } from '@/types/healthhomie';

export const emptyMacros = (): MacroNutrients => ({
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0,
});

export function scaleMacros(food: MacroNutrients, servings: number): MacroNutrients {
  return {
    calories: round(food.calories * servings),
    proteinG: round(food.proteinG * servings),
    carbsG: round(food.carbsG * servings),
    fatG: round(food.fatG * servings),
    fiberG: round((food.fiberG ?? 0) * servings),
    sugarG: round((food.sugarG ?? 0) * servings),
    sodiumMg: round((food.sodiumMg ?? 0) * servings),
  };
}

export function addMacros(a: MacroNutrients, b: MacroNutrients): MacroNutrients {
  return {
    calories: round(a.calories + b.calories),
    proteinG: round(a.proteinG + b.proteinG),
    carbsG: round(a.carbsG + b.carbsG),
    fatG: round(a.fatG + b.fatG),
    fiberG: round((a.fiberG ?? 0) + (b.fiberG ?? 0)),
    sugarG: round((a.sugarG ?? 0) + (b.sugarG ?? 0)),
    sodiumMg: round((a.sodiumMg ?? 0) + (b.sodiumMg ?? 0)),
  };
}

export function summarizeDay(date: string, entries: MealEntry[], foods: FoodItem[]): DailyNutritionSummary {
  const byId = new Map(foods.map((food) => [food.id, food]));
  const summary = entries
    .filter((entry) => entry.date === date)
    .reduce((total, entry) => {
      const food = byId.get(entry.foodItemId);
      if (!food) return total;
      return addMacros(total, scaleMacros(food, entry.servings));
    }, emptyMacros());

  return {
    date,
    entries: entries.filter((entry) => entry.date === date).length,
    ...summary,
  };
}

// Local calendar date, not UTC — using toISOString() here would flip "today" at UTC midnight,
// which is evening in US timezones and made logged food vanish from "today" hours too early.
export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return todayKey(shifted);
}

export function weekStartKey(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return shiftDateKey(date, -d.getDay());
}

export function weekDateKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(weekStart, i));
}

export function formatWeekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${shiftDateKey(weekStart, 6)}T00:00:00`);
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export function formatDateLabel(date: string): string {
  if (date === todayKey()) return 'Today';
  if (date === shiftDateKey(todayKey(), -1)) return 'Yesterday';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function round(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 10) / 10;
}
