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
