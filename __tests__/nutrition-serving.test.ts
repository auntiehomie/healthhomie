import { describe, it, expect, jest } from '@jest/globals';
jest.mock('../lib/services/authClient', () => ({ apiUrl: (path: string) => path, getToken: async () => null }));
import { hasUsableOpenFoodFactsCalories, mapOpenFoodFactsProduct } from '../lib/services/nutritionApi';

describe('Open Food Facts serving basis', () => {
  it('scales per-100 nutrients to the labelled serving', () => {
    const food = mapOpenFoodFactsProduct({ code: '1', serving_quantity: '30', serving_quantity_unit: 'g', nutriments: { 'energy-kcal_100g': 400, proteins_100g: 10, sodium_100g: 0.5 } });
    expect(food.servingSize).toBe(30);
    expect(food.calories).toBe(120);
    expect(food.proteinG).toBe(3);
    expect(food.sodiumMg).toBe(150);
  });
  it('uses per-serving values where present and scales other fields', () => {
    const food = mapOpenFoodFactsProduct({ code: '2', serving_quantity: '50', serving_quantity_unit: 'g', nutriments: { 'energy-kcal_serving': 80, 'energy-kcal_100g': 200, proteins_100g: 8 } });
    expect(food.calories).toBe(80);
    expect(food.proteinG).toBe(4);
  });
  it('retains the per-100 basis when the serving quantity is unknown', () => {
    const food = mapOpenFoodFactsProduct({ code: '3', serving_quantity: '1', serving_quantity_unit: 'bar', nutriments: { 'energy-kcal_100g': 400 } });
    expect([food.servingSize, food.servingUnit, food.calories]).toEqual([100, 'g', 400]);
  });
  it('distinguishes missing energy from zero and rejects an unconvertible serving', () => {
    expect(hasUsableOpenFoodFactsCalories({ nutriments: {} })).toBe(false);
    expect(hasUsableOpenFoodFactsCalories({ serving_quantity: '1', serving_quantity_unit: 'bar', nutriments: { 'energy-kcal_serving': 100 } })).toBe(false);
    expect(hasUsableOpenFoodFactsCalories({ nutriments: { 'energy-kcal_100g': 0 } })).toBe(true);
  });
});
