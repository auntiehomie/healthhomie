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

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function round(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 10) / 10;
}
