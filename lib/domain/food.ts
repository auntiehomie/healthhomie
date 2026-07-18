import type { FoodItem } from '@/types/healthhomie';

export function foodDisplayName(food: Pick<FoodItem, 'name' | 'brand'>): string {
  return food.brand ? `${food.brand} ${food.name}` : food.name;
}
