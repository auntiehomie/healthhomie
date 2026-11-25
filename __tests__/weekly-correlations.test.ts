import { test, expect } from '@jest/globals';
import { weeklyJournalInsights } from '../lib/domain/weeklyJournalInsights';
import type { MealEntry } from '../types/healthhomie';

test('pairs late meals with next-day outcomes, not same-day scores; excludes current week', () => {
  const entries = Array.from({ length: 12 }, (_, i) => ({ id: String(i), foodItemId: 'food', date: `2026-11-${String(i + 1).padStart(2, '0')}`, hour: i < 6 ? 22 : 18, servings: 1, mealType: 'dinner', createdAt: '' } as MealEntry));
  const metrics = entries.map((e, i) => ({ date: `2026-11-${String(i + 2).padStart(2, '0')}`, sleepScore: i < 6 ? 60 : 90 }));
  const report = weeklyJournalInsights({ today: '2026-11-25', entries, nutrition: [], notes: [], metrics, proteinTargetG: 100 });
  expect(report.end).toBe('2026-11-22');
  expect(report.insights.find(i => i.id === 'late-sleepScore')).toMatchObject({ exposedDays: 6, comparisonDays: 6, delta: -30 });
  expect(weeklyJournalInsights({ today: '2026-11-04', entries, nutrition: [], notes: [], metrics, proteinTargetG: 100 }).insights).toEqual([]);
  expect(weeklyJournalInsights({ today: '2026-11-25', entries: entries.map(e => ({ ...e, hour: undefined })), nutrition: [], notes: [], metrics, proteinTargetG: 100 }).insights).toEqual([]);
  expect(weeklyJournalInsights({ today: '2026-11-25', entries, nutrition: [], notes: [], metrics: metrics.map(m => ({ ...m, sleepScore: NaN })), proteinTargetG: 100 }).insights).toEqual([]);
});
