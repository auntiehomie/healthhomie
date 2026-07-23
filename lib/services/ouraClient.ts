import { createHealthProviderClient } from '@/lib/services/healthProviderClient';
import type { HealthMetricsDaily } from '@/types/healthhomie';

const client = createHealthProviderClient('oura', 'Oura');

export async function connectOura(): Promise<{ connected: boolean; reason?: string }> {
  return client.connect();
}

export async function syncOura(): Promise<{ synced: number; reason?: string; metrics?: HealthMetricsDaily[] }> {
  return client.sync();
}

export async function getOuraStatus(): Promise<{ connected: boolean; lastSyncedAt?: string }> {
  return client.getStatus();
}
