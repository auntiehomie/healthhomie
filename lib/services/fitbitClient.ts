import { createHealthProviderClient } from '@/lib/services/healthProviderClient';
import type { HealthMetricsDaily } from '@/types/healthhomie';

const client = createHealthProviderClient('fitbit', 'Fitbit');

export async function connectFitbit(): Promise<{ connected: boolean; reason?: string }> {
  return client.connect();
}

export async function syncFitbit(): Promise<{ synced: number; reason?: string; metrics?: HealthMetricsDaily[] }> {
  return client.sync();
}

export async function getFitbitStatus(): Promise<{ connected: boolean; lastSyncedAt?: string }> {
  return client.getStatus();
}
