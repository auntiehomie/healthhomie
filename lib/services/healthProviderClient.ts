import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiUrl, getToken } from '@/lib/services/authClient';
import type { HealthMetricsDaily } from '@/types/healthhomie';

/** Oura and Fitbit both use the identical connect/sync/status OAuth flow shape against
 * provider-specific endpoints - this factory is shared by ouraClient.ts and fitbitClient.ts so a
 * fix to one provider's flow can't silently drift out of sync with the other's. */
export function createHealthProviderClient(providerKey: string, providerLabel: string) {
  async function connect(): Promise<{ connected: boolean; reason?: string }> {
    const token = await getToken();
    if (!token) return { connected: false, reason: 'Log in first.' };

    const startResponse = await fetch(apiUrl(`/api/${providerKey}/start`), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    if (!startResponse.ok) return { connected: false, reason: `Could not start the ${providerLabel} connection.` };
    const { authorizeUrl } = await startResponse.json();

    if (Platform.OS === 'web') {
      window.location.assign(authorizeUrl);
      return { connected: false };
    }

    const redirectUrl = apiUrl(`/${providerKey}/connected`);
    const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
    if (result.type !== 'success' || !('url' in result) || !result.url) {
      return { connected: false, reason: `${providerLabel} connection was cancelled.` };
    }
    const parsed = new URL(result.url);
    const error = parsed.searchParams.get('error');
    if (error) return { connected: false, reason: `${providerLabel} connection failed (${error}).` };
    return { connected: parsed.searchParams.get('connected') === 'true' };
  }

  async function sync(): Promise<{ synced: number; reason?: string; metrics?: HealthMetricsDaily[] }> {
    const token = await getToken();
    if (!token) return { synced: 0, reason: 'Log in first.' };

    const response = await fetch(apiUrl(`/api/${providerKey}/sync`), { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { synced: 0, reason: payload.error ?? `${providerLabel} sync failed.` };
    return { synced: payload.metrics?.length ?? 0, metrics: payload.metrics };
  }

  async function getStatus(): Promise<{ connected: boolean; lastSyncedAt?: string }> {
    const token = await getToken();
    if (!token) return { connected: false };

    const response = await fetch(apiUrl(`/api/data/health-connections?provider=${providerKey}`), { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return { connected: false };
    const payload = await response.json();
    return { connected: payload.connection?.status === 'connected', lastSyncedAt: payload.connection?.lastSyncedAt ?? undefined };
  }

  return { connect, sync, getStatus };
}
