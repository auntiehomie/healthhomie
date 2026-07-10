import { apiUrl, getToken } from '@/lib/services/authClient';
import type { FoodItem, MealEntry, UserProfile } from '@/types/healthhomie';

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

export async function getUserProfile(): Promise<UserProfile> {
  const response = await apiFetch('/api/data/profile');
  return response.json();
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await apiFetch('/api/data/profile', { method: 'PUT', body: JSON.stringify(profile) });
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
