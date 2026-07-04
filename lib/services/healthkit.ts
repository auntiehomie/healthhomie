import { Platform } from 'react-native';
import type { HealthSnapshot } from '@/types/healthhomie';

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

export async function requestHealthPermissions(): Promise<{ available: boolean; granted: boolean; reason?: string }> {
  if (Platform.OS !== 'ios') return { available: false, granted: false, reason: 'HealthKit is iOS-only.' };

  try {
    const healthkit = await loadHealthkit();
    const available = await healthkit.isHealthDataAvailable();
    if (!available) return { available: false, granted: false, reason: 'Apple Health data is not available on this device.' };

    await healthkit.requestAuthorization({ toRead: readTypes as never, toShare: writeTypes as never });
    return { available: true, granted: true };
  } catch (error) {
    return { available: true, granted: false, reason: error instanceof Error ? error.message : 'HealthKit authorization failed.' };
  }
}

export async function readTodayHealthSnapshot(): Promise<HealthSnapshot> {
  const date = new Date().toISOString().slice(0, 10);
  if (Platform.OS !== 'ios') return { date };

  // Adapter boundary: wire exact sample queries here after testing on a real iPhone/custom dev build.
  // Keeping this isolated prevents HealthKit native APIs from leaking through UI code.
  return { date };
}

async function loadHealthkit(): Promise<HealthkitModule> {
  return import('@kingstinct/react-native-healthkit');
}
