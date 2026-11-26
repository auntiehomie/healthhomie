import { test, expect } from '@jest/globals';
import { parsePhotoMeal, validMealImage } from '../lib/domain/photoMeal';

test('validates bounded JPEG input and rejects arbitrary URLs', () => {
  expect(validMealImage('/9j/AA==')).toBe(true);
  expect(validMealImage('https://example.com/image.jpg')).toBe(false);
  expect(validMealImage('A'.repeat(3_500_001))).toBe(false);
});
test('parses estimates but rejects negative, missing or unbounded macros', () => {
  const item = { name: 'Rice', calories: 200, proteinG: 4, carbsG: 44, fatG: 1 };
  expect(parsePhotoMeal(JSON.stringify({ items: [item] }))).toEqual([item]);
  expect(parsePhotoMeal(JSON.stringify({ items: [{ ...item, calories: -1 }] }))).toBeNull();
  expect(parsePhotoMeal('{"items":[]}')).toEqual([]);
  expect(parsePhotoMeal('not JSON')).toBeNull();
});
