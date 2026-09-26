import { apiUrl, getToken } from '@/lib/services/authClient';
import type { ExerciseEntry, FoodItem, MealEntry, Recipe, UserProfile, WeightLog } from '@/types/healthhomie';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error('Not logged in.');
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { ...(options.headers ?? {}), authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed (${response.status}).`);
  }
  return response;
}

export async function listFoodItems(): Promise<FoodItem[]> {
  const response = await apiFetch('/api/data/foods');
  const payload = await response.json();
  return payload.foods;
}

export async function upsertFoodItem(food: FoodItem): Promise<void> {
  await apiFetch('/api/data/foods', { method: 'POST', body: JSON.stringify(food) });
}

export async function listMealEntries(date?: string): Promise<MealEntry[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const response = await apiFetch(`/api/data/meal-entries${query}`);
  const payload = await response.json();
  return payload.entries;
}

export async function addMealEntry(entry: MealEntry): Promise<void> {
  await apiFetch('/api/data/meal-entries', { method: 'POST', body: JSON.stringify(entry) });
}

export async function deleteMealEntry(entryId: string): Promise<void> {
  await apiFetch(`/api/data/meal-entries?id=${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}

export async function updateMealEntry(entry: Pick<MealEntry, 'id' | 'servings' | 'hour' | 'mealType'>): Promise<void> {
  await apiFetch('/api/data/meal-entries', { method: 'PUT', body: JSON.stringify(entry) });
}

export async function getUserProfile(): Promise<UserProfile> {
  const response = await apiFetch('/api/data/profile');
  return response.json();
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await apiFetch('/api/data/profile', { method: 'PUT', body: JSON.stringify(profile) });
}

export async function listRecipes(): Promise<Recipe[]> {
  const response = await apiFetch('/api/data/recipes');
  const payload = await response.json();
  return payload.recipes;
}

export async function saveRecipe(input: { id?: string; name: string; servings: number; ingredients: { foodItemId: string; servings: number }[]; favorite?: boolean }): Promise<Recipe> {
  const response = await apiFetch('/api/data/recipes', { method: 'POST', body: JSON.stringify(input) });
  const payload = await response.json();
  return payload.recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  await apiFetch(`/api/data/recipes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ── Exercise ──────────────────────────────────────────────────────────────────

export async function listExercises(date?: string): Promise<ExerciseEntry[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const response = await apiFetch(`/api/data/exercises${query}`);
  const payload = await response.json();
  return payload.entries;
}

export async function listExercisesByDateRange(days: number): Promise<ExerciseEntry[]> {
  const response = await apiFetch(`/api/data/exercises?days=${days}`);
  const payload = await response.json();
  return payload.entries;
}

export async function insertExercise(entry: ExerciseEntry): Promise<void> {
  await apiFetch('/api/data/exercises', { method: 'POST', body: JSON.stringify(entry) });
}

export async function deleteExercise(entryId: string): Promise<void> {
  await apiFetch(`/api/data/exercises?id=${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}

// ── Weight ────────────────────────────────────────────────────────────────────

export async function getWeightHistory(days = 90): Promise<WeightLog[]> {
  const response = await apiFetch(`/api/data/weights?days=${days}`);
  const payload = await response.json();
  return payload.entries;
}

export async function getLatestWeight(): Promise<WeightLog | null> {
  const response = await apiFetch('/api/data/weights?days=1');
  const payload = await response.json();
  return payload.entries?.[0] ?? null;
}

export async function logWeight(date: string, weightKg: number): Promise<WeightLog> {
  const entry: WeightLog = {
    id: createId('weight'),
    date,
    weightKg,
    createdAt: new Date().toISOString(),
  };
  await apiFetch('/api/data/weights', { method: 'POST', body: JSON.stringify(entry) });
  return entry;
}
