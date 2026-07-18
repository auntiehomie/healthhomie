import type { MealType } from '@/types/healthhomie';

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${h12} ${period}`;
}

/** mealType stays required in the schema and unused by any calculation logic, but keeping it
    populated (derived from the chosen hour) avoids a breaking migration and keeps old clients happy. */
export function deriveMealType(hour: number): MealType {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}
