import type { GoalType, HealthSnapshot, NutritionGoal, UserProfile, WeeklyCheckIn } from '@/types/healthhomie';
import { round } from './nutrition';

const GOAL_DELTAS: Record<GoalType, number> = {
  'lose-weight': -350,
  maintain: 0,
  'gain-muscle': 250,
  'improve-consistency': 0,
};

export function estimateBasalMetabolicRate(profile: UserProfile): number {
  const weight = profile.currentWeightKg ?? 75;
  const height = profile.heightCm ?? 165;
  const age = profile.age ?? 35;
  const sexOffset = profile.sex === 'male' ? 5 : profile.sex === 'female' ? -161 : -78;
  return 10 * weight + 6.25 * height - 5 * age + sexOffset;
}

// Protein multipliers (g per kg bodyweight), grounded in the ISSN position stand on protein and
// exercise: 1.4-2.0 g/kg covers most exercising adults building/maintaining muscle, while a
// caloric deficit specifically needs the higher end (2.3-3.1 g/kg in resistance-trained subjects)
// to preserve lean mass. These aren't at the extreme upper bound of either range - they're a
// general-audience estimate, not a substitute for individualized guidance from a doctor or
// registered dietitian.
const PROTEIN_G_PER_KG: Record<GoalType, number> = {
  'lose-weight': 2.2,
  maintain: 1.6,
  'gain-muscle': 2.0,
  'improve-consistency': 1.6,
};

export function calculateDailyGoal(profile: UserProfile, snapshot?: HealthSnapshot): NutritionGoal {
  const bmr = estimateBasalMetabolicRate(profile);
  const activeEnergy = snapshot?.activeEnergyKcal ?? 0;
  const tdee = bmr * profile.activityMultiplier + activeEnergy * 0.35;
  const computedCalories = round(tdee + GOAL_DELTAS[profile.goalType]);
  const calories = Math.max(1300, profile.calorieOverride ?? computedCalories);
  const weightKg = profile.currentWeightKg ?? snapshot?.weightKg ?? 75;
  const proteinTargetG = weightKg * PROTEIN_G_PER_KG[profile.goalType];
  const fatG = Math.max(45, (calories * 0.27) / 9);
  const carbsG = Math.max(80, (calories - proteinTargetG * 4 - fatG * 9) / 4);

  return {
    id: 'current',
    goalType: profile.goalType,
    effectiveFrom: new Date().toISOString(),
    calories: round(calories),
    proteinG: round(proteinTargetG),
    proteinTargetG: round(proteinTargetG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    calorieFloor: round(calories - 100),
    calorieCeiling: round(calories + 100),
    notes: profile.calorieOverride
      ? 'Manually set. Protein/carbs/fat are still derived from this calorie target.'
      : 'Generated locally from profile, activity baseline, and Apple Health context when available. Estimates based on general sports-nutrition research, not medical advice.',
  };
}

export function recommendWeeklyAdjustment(params: {
  goal: NutritionGoal;
  checkIn: Omit<WeeklyCheckIn, 'id' | 'createdAt' | 'recommendedCalorieDelta' | 'insight'>;
  previousAverageWeightKg?: number;
}): Pick<WeeklyCheckIn, 'recommendedCalorieDelta' | 'insight'> {
  const { goal, checkIn, previousAverageWeightKg } = params;
  const weightTrend = previousAverageWeightKg && checkIn.averageWeightKg ? checkIn.averageWeightKg - previousAverageWeightKg : 0;
  const calorieGap = checkIn.averageCalories - goal.calories;
  const lowProtein = checkIn.averageProteinG < goal.proteinTargetG * 0.85;
  const poorAdherence = checkIn.adherencePct < 70;

  if (poorAdherence) {
    return {
      recommendedCalorieDelta: 0,
      insight: 'Focus on logging consistency before changing targets. More complete data beats fake precision.',
    };
  }

  if (lowProtein) {
    return {
      recommendedCalorieDelta: 0,
      insight: 'Protein is the first lever. Hit the protein target for a week before adjusting calories.',
    };
  }

  if (goal.goalType === 'lose-weight' && weightTrend >= -0.1 && calorieGap <= 100) {
    return { recommendedCalorieDelta: -100, insight: 'Weight trend is flat while logging is consistent. Consider lowering the calorie target by 100.' };
  }

  if (goal.goalType === 'gain-muscle' && weightTrend < 0.1 && calorieGap >= -100) {
    return { recommendedCalorieDelta: 100, insight: 'Training/gain goal needs more fuel. Consider raising calories by 100.' };
  }

  return { recommendedCalorieDelta: 0, insight: 'Targets look reasonable. Keep the same plan and review again next week.' };
}
