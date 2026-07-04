import * as SQLite from 'expo-sqlite';
import { schemaStatements } from './schema';
import type { FoodItem, MealEntry, UserProfile } from '@/types/healthhomie';

const db = SQLite.openDatabaseSync('healthhomie.db');

export async function initializeDatabase(): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const statement of schemaStatements) {
      await db.execAsync(statement);
    }
  });
}

export async function seedDemoData(): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM food_items');
  if ((existing?.count ?? 0) > 0) return;
  const now = new Date().toISOString();
  const foods: FoodItem[] = [
    { id: 'demo-greek-yogurt', name: 'Greek yogurt', brand: 'Demo', servingSize: 170, servingUnit: 'g', source: 'manual', calories: 100, proteinG: 17, carbsG: 6, fatG: 0, createdAt: now, updatedAt: now },
    { id: 'demo-oats', name: 'Rolled oats', brand: 'Demo', servingSize: 40, servingUnit: 'g', source: 'manual', calories: 150, proteinG: 5, carbsG: 27, fatG: 3, fiberG: 4, createdAt: now, updatedAt: now },
    { id: 'demo-chicken-rice', name: 'Chicken + rice bowl', brand: 'Homie meal', servingSize: 1, servingUnit: 'bowl', source: 'custom', calories: 520, proteinG: 42, carbsG: 58, fatG: 12, createdAt: now, updatedAt: now },
  ];
  for (const food of foods) await upsertFoodItem(food);
}

export async function upsertFoodItem(food: FoodItem): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO food_items
      (id, name, brand, barcode, servingSize, servingUnit, source, sourceId, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    food.id, food.name, food.brand ?? null, food.barcode ?? null, food.servingSize, food.servingUnit, food.source, food.sourceId ?? null,
    food.calories, food.proteinG, food.carbsG, food.fatG, food.fiberG ?? null, food.sugarG ?? null, food.sodiumMg ?? null, food.createdAt, food.updatedAt,
  );
}

export async function listFoodItems(): Promise<FoodItem[]> {
  return db.getAllAsync<FoodItem>('SELECT * FROM food_items ORDER BY updatedAt DESC, name ASC');
}

export async function addMealEntry(entry: MealEntry): Promise<void> {
  await db.runAsync(
    `INSERT INTO meal_entries (id, foodItemId, mealType, date, servings, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    entry.id, entry.foodItemId, entry.mealType, entry.date, entry.servings, entry.notes ?? null, entry.createdAt,
  );
}

export async function listMealEntries(date?: string): Promise<MealEntry[]> {
  if (date) return db.getAllAsync<MealEntry>('SELECT * FROM meal_entries WHERE date = ? ORDER BY createdAt DESC', date);
  return db.getAllAsync<MealEntry>('SELECT * FROM meal_entries ORDER BY date DESC, createdAt DESC LIMIT 200');
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profile
      (id, age, sex, heightCm, currentWeightKg, targetWeightKg, goalType, activityMultiplier, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    profile.id, profile.age ?? null, profile.sex ?? null, profile.heightCm ?? null, profile.currentWeightKg ?? null, profile.targetWeightKg ?? null,
    profile.goalType, profile.activityMultiplier, profile.createdAt, profile.updatedAt,
  );
}

export async function getUserProfile(): Promise<UserProfile> {
  const profile = await db.getFirstAsync<UserProfile>('SELECT * FROM user_profile LIMIT 1');
  if (profile) return profile;
  const now = new Date().toISOString();
  const starter: UserProfile = {
    id: 'local-user',
    goalType: 'improve-consistency',
    activityMultiplier: 1.2,
    createdAt: now,
    updatedAt: now,
  };
  await saveUserProfile(starter);
  return starter;
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
