import type { ExerciseEntry, ExerciseType } from '@/types/healthhomie';

// Rough MET-based calorie burn estimates per minute for a 75 kg person — a coarse default for
// when the user doesn't enter calories manually. Not a substitute for a wearable.
const CALORIES_PER_MINUTE: Record<ExerciseType, number> = {
  walking: 4.5,
  running: 10.5,
  strength: 6.0,
  yoga: 3.5,
  cycling: 8.0,
  swimming: 9.0,
  sports: 7.0,
  other: 5.0,
};

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  walking: 'Walking',
  running: 'Running',
  strength: 'Strength',
  yoga: 'Yoga',
  cycling: 'Cycling',
  swimming: 'Swimming',
  sports: 'Sports',
  other: 'Other',
};

export const EXERCISE_TYPES: ExerciseType[] = [
  'walking',
  'running',
  'strength',
  'yoga',
  'cycling',
  'swimming',
  'sports',
  'other',
];

export function estimateCaloriesBurned(type: ExerciseType, durationMin: number, weightKg = 75): number {
  const metPerMin = CALORIES_PER_MINUTE[type] / 75 * weightKg;
  return Math.round(metPerMin * durationMin);
}

export function summarizeExerciseByDate(
  date: string,
  entries: ExerciseEntry[]
): { totalMinutes: number; totalCalories: number; count: number } {
  const dayEntries = entries.filter((e) => e.date === date);
  return {
    totalMinutes: dayEntries.reduce((sum, e) => sum + e.durationMin, 0),
    totalCalories: dayEntries.reduce((sum, e) => sum + (e.caloriesBurned ?? 0), 0),
    count: dayEntries.length,
  };
}

export function exerciseChipColor(type: ExerciseType): string {
  switch (type) {
    case 'running': return '#ef4444';
    case 'cycling': return '#f97316';
    case 'swimming': return '#3b82f6';
    case 'strength': return '#8b5cf6';
    case 'yoga': return '#22c55e';
    case 'sports': return '#eab308';
    case 'walking': return '#06b6d4';
    default: return '#6b7280';
  }
}