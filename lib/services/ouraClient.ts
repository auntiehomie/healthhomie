import { apiUrl, getToken } from '@/lib/services/authClient';
import { createHealthProviderClient } from '@/lib/services/healthProviderClient';
import type { HealthMetricsDaily } from '@/types/healthhomie';

const client = createHealthProviderClient('oura', 'Oura');

export async function connectOura(): Promise<{ connected: boolean; reason?: string }> {
  return client.connect();
}

export async function syncOura(): Promise<{ synced: number; reason?: string; metrics?: HealthMetricsDaily[]; reauthRequired?: boolean }> {
  return client.sync();
}

/**
 * Oura-specific status check. Unlike the shared factory's DB-only `getStatus`, this
 * hits a probe endpoint that verifies the stored token can still be refreshed, so the
 * UI can surface a "Reconnect Oura" CTA when re-authentication is required (vs. the
 * silent no-data state an expired access token would otherwise produce).
 */
export async function getOuraStatus(): Promise<{ connected: boolean; lastSyncedAt?: string; reauthRequired?: boolean }> {
  const token = await getToken();
  if (!token) return { connected: false };

  const response = await fetch(apiUrl('/api/oura/status'), { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return { connected: false };
  const payload = await response.json();
  return {
    connected: payload.connected === true,
    lastSyncedAt: payload.lastSyncedAt ?? undefined,
    reauthRequired: payload.reauthRequired === true,
  };
}
