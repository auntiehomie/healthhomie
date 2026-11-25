import { test, expect, jest, beforeEach } from '@jest/globals';
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }), { virtual: true });
const stats = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const samples = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const save = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const authorize = jest.fn<(...args: unknown[]) => Promise<void>>();
const available = jest.fn<() => Promise<boolean>>();
jest.mock('@kingstinct/react-native-healthkit', () => ({
  queryStatisticsForQuantity: stats, queryQuantitySamples: samples, saveQuantitySample: save,
  isHealthDataAvailable: available, requestAuthorization: authorize,
}));
import { Platform } from 'react-native';
import { readTodayHealthSnapshot, requestHealthPermissions, writeNutritionTotals } from '../lib/services/healthkit';
beforeEach(() => { jest.clearAllMocks(); Platform.OS = 'ios'; });
test('reads real native steps, energy and latest weight rather than an empty snapshot', async () => {
  stats.mockResolvedValueOnce({ sumQuantity: { quantity: 1200 } }).mockResolvedValueOnce({ sumQuantity: { quantity: 75 } });
  samples.mockResolvedValueOnce([{ quantity: 72 }]);
  expect(await readTodayHealthSnapshot()).toMatchObject({ steps: 1200, activeEnergyKcal: 75, weightKg: 72 });
});
test('exports four nutrition quantities with stable account/date identifiers and a version', async () => {
  save.mockResolvedValue({ uuid: 'sample' });
  const totals = { date: '2026-11-24', entries: 2, calories: 2000, proteinG: 100, carbsG: 220, fatG: 65 };
  expect(await writeNutritionTotals('account', totals, 123)).toBe(4);
  expect(save).toHaveBeenCalledTimes(4);
  expect(save.mock.calls[0][5]).toEqual({ HKMetadataKeySyncIdentifier: 'healthhomie:account:2026-11-24:calories', HKMetadataKeySyncVersion: 123 });
  expect(save.mock.calls[0].slice(0, 3)).toEqual(['HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', 2000]);
});
test('rejects malformed exports before writing and never loads native on web', async () => {
  const totals = { date: '2026-02-30', entries: 1, calories: 2, proteinG: 1, carbsG: 1, fatG: 1 };
  await expect(writeNutritionTotals('account', totals, 1)).rejects.toThrow();
  expect(save).not.toHaveBeenCalled();
  Platform.OS = 'web';
  expect(await readTodayHealthSnapshot()).toEqual({ date: expect.any(String) });
  await expect(writeNutritionTotals('account', totals, 1)).rejects.toThrow('iOS');
});
test('requests write permission only on explicit opt-in', async () => {
  available.mockResolvedValue(true);
  await requestHealthPermissions();
  expect(authorize).toHaveBeenLastCalledWith(expect.objectContaining({ toShare: [] }));
  await requestHealthPermissions(true);
  expect(authorize).toHaveBeenLastCalledWith(expect.objectContaining({ toShare: expect.arrayContaining(['HKQuantityTypeIdentifierDietaryEnergyConsumed']) }));
});
test('keeps missing reads unknown and surfaces write denials', async () => {
  stats.mockResolvedValue({}); samples.mockResolvedValue([]);
  expect(await readTodayHealthSnapshot()).toMatchObject({ steps: undefined, weightKg: undefined });
  save.mockResolvedValue(undefined);
  await expect(writeNutritionTotals('account', { date: '2026-11-24', entries: 1, calories: 1, proteinG: 1, carbsG: 1, fatG: 1 })).rejects.toThrow('Check write permissions');
});
