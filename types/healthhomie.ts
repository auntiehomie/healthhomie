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

export type FoodSource = 'manual' | 'usda' | 'open-food-facts' | 'custom' | 'spoonacular';

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
  /** Local hour of day (0-23) the food was logged for — the primary time UI now uses; mealType is kept in sync but derived. */
  hour?: number;
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
  /** Manual override for the daily calorie target; when unset, the goal is fully computed from BMR/activity. */
  calorieOverride?: number;
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

export type HealthProvider = 'apple-health' | 'oura' | 'fitbit' | 'manual';

export type HealthConnectionStatus = 'connected' | 'expired' | 'revoked' | 'error';

export type HealthConnection = {
  id: string;
  provider: HealthProvider;
  providerUserId?: string;
  status: HealthConnectionStatus;
  scopes?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthMetricsDaily = {
  date: string;
  provider: HealthProvider;
  steps?: number;
  activeEnergyKcal?: number;
  totalEnergyKcal?: number;
  weightKg?: number;
  sleepMinutes?: number;
  sleepScore?: number;
  readinessScore?: number;
  activityScore?: number;
  restingHeartRate?: number;
  hrvMs?: number;
  spo2Pct?: number;
  workouts?: number;
};

export type RecipeIngredient = {
  id: string;
  foodItemId: string;
  servings: number;
  food?: FoodItem;
};

export type Recipe = {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
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
