import { apiUrl, getToken } from '@/lib/services/authClient';
import type { FoodItem } from '@/types/healthhomie';

type UsdaFood = {
  fdcId: number;
  description: string;
  brandName?: string;
  foodNutrients?: Array<{ nutrientName?: string; nutrientNumber?: string; value?: number; unitName?: string }>;
  servingSize?: number;
  servingSizeUnit?: string;
};

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
  serving_quantity?: string;
  serving_quantity_unit?: string;
};

export type RestaurantMenuItemSummary = {
  id: number;
  title: string;
  restaurantChain: string;
};

type SpoonacularMenuItem = {
  id: number;
  title: string;
  restaurantChain?: string;
};

type SpoonacularNutrient = { name: string; amount?: number };

type SpoonacularMenuItemDetail = {
  id: number;
  title: string;
  restaurantChain?: string;
  servings?: { number?: number; size?: number | null; unit?: string | null };
  nutrition?: { nutrients?: SpoonacularNutrient[] };
};

export async function searchUsdaFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return [];
  const response = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.error === 'string' ? payload.error : typeof payload.message === 'string' ? payload.message : null;
    throw new Error(detail ? `USDA search failed: ${detail}` : `USDA search failed (${response.status}). Try again in a moment.`);
  }
  const payload = await response.json();
  return (payload.foods ?? []).map(mapUsdaFood);
}

export async function searchRestaurantFoods(query: string, limit = 20): Promise<RestaurantMenuItemSummary[]> {
  if (!query.trim()) return [];
  const response = await fetch(`/api/nutrition/restaurant-search?q=${encodeURIComponent(query)}&number=${limit}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.error === 'string' ? payload.error : null;
    throw new Error(detail ? `Restaurant search failed: ${detail}` : `Restaurant search failed (${response.status}). Try again in a moment.`);
  }
  const payload = await response.json();
  return ((payload.menuItems ?? []) as SpoonacularMenuItem[]).map((item) => ({
    id: item.id,
    title: item.title,
    restaurantChain: item.restaurantChain ?? 'Restaurant',
  }));
}

// Menu search results don't include nutrients — a separate detail lookup is required per item,
// so this is only called once the user actually picks a result, not for every row in the list.
export async function getRestaurantFoodItem(id: number): Promise<FoodItem> {
  const response = await fetch(`/api/nutrition/restaurant-item?id=${id}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.error === 'string' ? payload.error : null;
    throw new Error(detail ? `Couldn't load menu item: ${detail}` : `Couldn't load menu item (${response.status}).`);
  }
  const payload = (await response.json()) as SpoonacularMenuItemDetail;
  return mapSpoonacularMenuItem(payload);
}

// Asks the server to pick the closest match to `query` from a list of already-fetched real
// search results — the AI only ever ranks/selects real candidates, it never invents an item or
// estimates nutrition itself, so a match still comes from Spoonacular's real data.
export async function findClosestRestaurantMatch(
  query: string,
  candidates: RestaurantMenuItemSummary[]
): Promise<{ bestMatchId: number | null; note: string }> {
  const token = await getToken();
  if (!token) throw new Error('Not logged in.');
  const response = await fetch(apiUrl('/api/ai/food-match'), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, candidates }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.error === 'string' ? payload.error : null;
    throw new Error(detail ?? `AI matching failed (${response.status}).`);
  }
  return response.json();
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const response = await fetch(`/api/foodfacts/barcode/${encodeURIComponent(barcode)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Barcode lookup failed');
  const payload = await response.json();
  return mapOpenFoodFactsProduct(payload.product);
}

function mapUsdaFood(food: UsdaFood): FoodItem {
  const nutrients = new Map((food.foodNutrients ?? []).map((nutrient) => [(nutrient.nutrientNumber ?? nutrient.nutrientName ?? '').toLowerCase(), nutrient.value ?? 0]));
  const now = new Date().toISOString();
  return {
    id: `usda-${food.fdcId}`,
    name: titleCase(food.description),
    brand: food.brandName,
    servingSize: food.servingSize ?? 100,
    servingUnit: food.servingSizeUnit ?? 'g',
    source: 'usda',
    sourceId: String(food.fdcId),
    calories: nutrient(nutrients, ['208', 'energy']),
    proteinG: nutrient(nutrients, ['203', 'protein']),
    carbsG: nutrient(nutrients, ['205', 'carbohydrate']),
    fatG: nutrient(nutrients, ['204', 'total lipid', 'fat']),
    fiberG: nutrient(nutrients, ['291', 'fiber']),
    sugarG: nutrient(nutrients, ['269', 'sugars']),
    sodiumMg: nutrient(nutrients, ['307', 'sodium']),
    createdAt: now,
    updatedAt: now,
  };
}

function mapOpenFoodFactsProduct(product: OpenFoodFactsProduct): FoodItem {
  const nutriments = product.nutriments ?? {};
  const now = new Date().toISOString();
  return {
    id: `off-${product.code}`,
    name: product.product_name || 'Packaged food',
    brand: product.brands,
    barcode: product.code,
    servingSize: Number(product.serving_quantity) || 100,
    servingUnit: product.serving_quantity_unit || 'g',
    source: 'open-food-facts',
    sourceId: product.code,
    calories: numberish(nutriments['energy-kcal_serving'] ?? nutriments['energy-kcal_100g']),
    proteinG: numberish(nutriments.proteins_serving ?? nutriments.proteins_100g),
    carbsG: numberish(nutriments.carbohydrates_serving ?? nutriments.carbohydrates_100g),
    fatG: numberish(nutriments.fat_serving ?? nutriments.fat_100g),
    fiberG: numberish(nutriments.fiber_serving ?? nutriments.fiber_100g),
    sugarG: numberish(nutriments.sugars_serving ?? nutriments.sugars_100g),
    sodiumMg: numberish(nutriments.sodium_serving ?? nutriments.sodium_100g) * 1000,
    createdAt: now,
    updatedAt: now,
  };
}

function mapSpoonacularMenuItem(item: SpoonacularMenuItemDetail): FoodItem {
  const nutrients = item.nutrition?.nutrients ?? [];
  const findNutrient = (name: string) => nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount ?? 0;
  const now = new Date().toISOString();
  return {
    id: `spoonacular-${item.id}`,
    name: item.title,
    brand: item.restaurantChain,
    servingSize: item.servings?.size ?? item.servings?.number ?? 1,
    servingUnit: item.servings?.unit ?? 'serving',
    source: 'spoonacular',
    sourceId: String(item.id),
    calories: findNutrient('Calories'),
    proteinG: findNutrient('Protein'),
    carbsG: findNutrient('Carbohydrates'),
    fatG: findNutrient('Fat'),
    fiberG: findNutrient('Fiber'),
    sugarG: findNutrient('Sugar'),
    sodiumMg: findNutrient('Sodium'),
    createdAt: now,
    updatedAt: now,
  };
}

function nutrient(map: Map<string, number>, keys: string[]): number {
  for (const [key, value] of map) {
    if (keys.some((candidate) => key.includes(candidate))) return value;
  }
  return 0;
}

function numberish(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
