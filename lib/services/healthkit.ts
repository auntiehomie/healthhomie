import { Platform } from 'react-native';
import type { DailyNutritionSummary, HealthSnapshot } from '@/types/healthhomie';

type HealthkitModule = typeof import('@kingstinct/react-native-healthkit');

const readTypes = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierBodyMass',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKWorkoutTypeIdentifier',
] as const;

const writeTypes = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
] as const;

export async function requestHealthPermissions(writeNutrition = false): Promise<{ available: boolean; granted: boolean; reason?: string }> {
  if (Platform.OS !== 'ios') return { available: false, granted: false, reason: 'HealthKit is iOS-only.' };

  try {
    const healthkit = await loadHealthkit();
    const available = await healthkit.isHealthDataAvailable();
    if (!available) return { available: false, granted: false, reason: 'Apple Health data is not available on this device.' };

    await healthkit.requestAuthorization({ toRead: readTypes as never, toShare: (writeNutrition ? writeTypes : []) as never });
    // HealthKit does not reveal read denial; granted means the request completed, not all scopes were approved.
    return { available: true, granted: true };
  } catch (error) {
    return { available: true, granted: false, reason: error instanceof Error ? error.message : 'HealthKit authorization failed.' };
  }
}

export async function readTodayHealthSnapshot(): Promise<HealthSnapshot> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const date = localDateKey(start);
  if (Platform.OS !== 'ios') return { date };
  const healthkit = await loadHealthkit();
  const filter = { date: { startDate: start, endDate: end, strictStartDate: true } };
  const [steps, energy, weights] = await Promise.all([
    healthkit.queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], { unit: 'count', filter }),
    healthkit.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], { unit: 'kcal', filter }),
    healthkit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', { unit: 'kg', limit: 1, ascending: false, filter }),
  ]);
  // No sample / read denial remains unknown, never a fabricated zero.
  return { date, steps: steps.sumQuantity?.quantity, activeEnergyKcal: energy.sumQuantity?.quantity, weightKg: weights[0]?.quantity };
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Explicit opt-in only. Stable sync identifiers replace this app's prior daily totals;
 * never import HealthKit nutrition back into the journal (avoids feedback loops).
 * Version must increase for each export; callers normally use Date.now(). */
export async function writeNutritionTotals(accountId: string, totals: DailyNutritionSummary, version = Date.now()): Promise<number> {
  if (Platform.OS !== 'ios') throw new Error('HealthKit is iOS-only.');
  const start = new Date(`${totals.date}T12:00:00`);
  if (!accountId || !/^\d{4}-\d{2}-\d{2}$/.test(totals.date) || !Number.isFinite(start.getTime()) || localDateKey(start) !== totals.date || !Number.isSafeInteger(version) || version < 1) throw new Error('Invalid nutrition export identity/date/version.');
  const quantities = [
    ['calories', 'HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal'],
    ['proteinG', 'HKQuantityTypeIdentifierDietaryProtein', 'g'],
    ['carbsG', 'HKQuantityTypeIdentifierDietaryCarbohydrates', 'g'],
    ['fatG', 'HKQuantityTypeIdentifierDietaryFatTotal', 'g'],
  ] as const;
  for (const [key] of quantities) {
    if (!Number.isFinite(totals[key]) || totals[key] < 0) throw new Error('Invalid nutrition quantity.');
  }
  const healthkit = await loadHealthkit();
  let written = 0;
  for (const [key, identifier, unit] of quantities) {
    const sample = await healthkit.saveQuantitySample(identifier, unit, totals[key], start, start, {
      HKMetadataKeySyncIdentifier: `healthhomie:${accountId}:${totals.date}:${key}`,
      HKMetadataKeySyncVersion: version,
    });
    if (!sample) throw new Error(`Apple Health did not save ${key}. Check write permissions and retry.`);
    written++;
  }
  return written;
}

async function loadHealthkit(): Promise<HealthkitModule> {
  return import('@kingstinct/react-native-healthkit');
}
