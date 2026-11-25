import { expect, test } from '@jest/globals';
import { normalizeGarminDailySummary, GARMIN_SYNC_CAPABILITIES } from '../lib/services/garminAdapter';

test('normalizes Garmin daily summary fields without inventing missing outcomes', () => {
  expect(normalizeGarminDailySummary({ calendarDate: '2026-11-24', steps: 5000, activeKilocalories: 200, totalKilocalories: 2100 })).toEqual({ date: '2026-11-24', provider: 'garmin', steps: 5000, activeEnergyKcal: 200, totalEnergyKcal: 2100 });
  expect(normalizeGarminDailySummary({ calendarDate: '2026-02-30' })).toBeNull();
  expect(normalizeGarminDailySummary({ calendarDate: '2026-11-24', steps: -1 })).toBeNull();
  expect(normalizeGarminDailySummary({ calendarDate: '2026-11-24', steps: '5000' })).toBeNull();
  expect(GARMIN_SYNC_CAPABILITIES.nutritionWrite).toBe(false);
  expect(GARMIN_SYNC_CAPABILITIES.connected).toBe(false);
});
