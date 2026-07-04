export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MacroNutrients = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
};

export type FoodSource = 'manual' | 'usda' | 'open-food-facts' | 'custom';

export type FoodItem = MacroNutrients & {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  servingSize: number;
  servingUnit: string;
  source: FoodSource;
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type MealEntry = {
  id: string;
  foodItemId: string;
  mealType: MealType;
  date: string;
  servings: number;
  notes?: string;
  createdAt: string;
};

export type DailyNutritionSummary = MacroNutrients & {
  date: string;
  entries: number;
};

export type GoalType = 'lose-weight' | 'maintain' | 'gain-muscle' | 'improve-consistency';

export type UserProfile = {
  id: string;
  age?: number;
  sex?: 'female' | 'male' | 'other';
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  goalType: GoalType;
  activityMultiplier: number;
  createdAt: string;
  updatedAt: string;
};

export type NutritionGoal = MacroNutrients & {
  id: string;
  goalType: GoalType;
  effectiveFrom: string;
  proteinTargetG: number;
  calorieFloor?: number;
  calorieCeiling?: number;
  notes?: string;
};

export type HealthSnapshot = {
  date: string;
  steps?: number;
  activeEnergyKcal?: number;
  weightKg?: number;
  sleepMinutes?: number;
  workouts?: number;
};

export type WeeklyCheckIn = {
  id: string;
  weekStart: string;
  averageCalories: number;
  averageProteinG: number;
  averageWeightKg?: number;
  adherencePct: number;
  recommendedCalorieDelta: number;
  insight: string;
  createdAt: string;
};
