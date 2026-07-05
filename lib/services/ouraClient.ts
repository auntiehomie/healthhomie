import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiUrl, getToken } from '@/lib/services/authClient';

export async function connectOura(): Promise<{ connected: boolean; reason?: string }> {
  const token = await getToken();
  if (!token) return { connected: false, reason: 'Log in first.' };

  const startResponse = await fetch(apiUrl('/api/oura/start'), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  if (!startResponse.ok) return { connected: false, reason: 'Could not start the Oura connection.' };
  const { authorizeUrl } = await startResponse.json();

  if (Platform.OS === 'web') {
    window.location.assign(authorizeUrl);
    return { connected: false };
  }

  const redirectUrl = apiUrl('/oura/connected');
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUrl);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return { connected: false, reason: 'Oura connection was cancelled.' };
  }
  const parsed = new URL(result.url);
  const error = parsed.searchParams.get('error');
  if (error) return { connected: false, reason: `Oura connection failed (${error}).` };
  return { connected: parsed.searchParams.get('connected') === 'true' };
}

export async function syncOura(): Promise<{ synced: number; reason?: string }> {
  const token = await getToken();
  if (!token) return { synced: 0, reason: 'Log in first.' };

  const response = await fetch(apiUrl('/api/oura/sync'), { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return { synced: 0, reason: payload.error ?? 'Oura sync failed.' };
  return { synced: payload.metrics?.length ?? 0 };
}

export async function getOuraStatus(): Promise<{ connected: boolean; lastSyncedAt?: string }> {
  const token = await getToken();
  if (!token) return { connected: false };

  const response = await fetch(apiUrl('/api/data/health-connections?provider=oura'), { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return { connected: false };
  const payload = await response.json();
  return { connected: payload.connection?.status === 'connected', lastSyncedAt: payload.connection?.lastSyncedAt ?? undefined };
}
