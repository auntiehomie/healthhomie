import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { createId, getHealthConnection, upsertHealthConnection, upsertHealthMetricsDaily } from '@/lib/db/database';
import type { HealthConnection } from '@/types/healthhomie';

const OURA_SCOPES = 'personal daily heartrate workout';

export type OuraCallbackParams = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_in?: string | null;
  error?: string | null;
};

export async function connectOura(): Promise<{ connected: boolean; reason?: string }> {
  const connectUrl = absoluteUrl('/api/oura/connect');

  if (Platform.OS === 'web') {
    window.location.assign(connectUrl);
    return { connected: false };
  }

  const redirectUrl = absoluteUrl('/oura/connected');
  const result = await WebBrowser.openAuthSessionAsync(connectUrl, redirectUrl);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return { connected: false, reason: 'Oura connection was cancelled.' };
  }
  const parsed = new URL(result.url);
  return persistOuraTokens(Object.fromEntries(parsed.searchParams));
}

export async function persistOuraTokens(params: OuraCallbackParams): Promise<{ connected: boolean; reason?: string }> {
  if (params.error) return { connected: false, reason: `Oura connection failed (${params.error}).` };
  if (!params.access_token || !params.refresh_token) return { connected: false, reason: 'Oura did not return tokens.' };

  const now = new Date().toISOString();
  const connection: HealthConnection = {
    id: createId('oura'),
    provider: 'oura',
    status: 'connected',
    scopes: OURA_SCOPES,
    accessToken: params.access_token,
    refreshToken: params.refresh_token,
    expiresAt: new Date(Date.now() + Number(params.expires_in ?? 0) * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  await upsertHealthConnection(connection);
  return { connected: true };
}

export async function syncOura(): Promise<{ synced: number; reason?: string }> {
  const connection = await getHealthConnection('oura');
  if (!connection?.accessToken) return { synced: 0, reason: 'Oura is not connected.' };

  let accessToken = connection.accessToken;
  let response = await fetchSync(accessToken);

  if (response.status === 401 && connection.refreshToken) {
    const refreshed = await refreshConnection(connection);
    if (!refreshed?.accessToken) return { synced: 0, reason: 'Oura session expired. Reconnect in Settings.' };
    accessToken = refreshed.accessToken;
    response = await fetchSync(accessToken);
  }

  if (!response.ok) return { synced: 0, reason: 'Oura sync failed.' };
  const payload = await response.json();
  await upsertHealthMetricsDaily(payload.metrics ?? []);
  await upsertHealthConnection({ ...connection, accessToken, lastSyncedAt: new Date().toISOString(), status: 'connected' });
  return { synced: payload.metrics?.length ?? 0 };
}

function fetchSync(accessToken: string): Promise<Response> {
  return fetch(absoluteUrl('/api/oura/sync'), { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } });
}

async function refreshConnection(connection: HealthConnection): Promise<HealthConnection | null> {
  const response = await fetch(absoluteUrl('/api/oura/refresh'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: connection.refreshToken }),
  });
  if (!response.ok) {
    await upsertHealthConnection({ ...connection, status: 'expired', updatedAt: new Date().toISOString() });
    return null;
  }
  const token = await response.json();
  const updated: HealthConnection = {
    ...connection,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: new Date(Date.now() + Number(token.expires_in ?? 0) * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await upsertHealthConnection(updated);
  return updated;
}

function absoluteUrl(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${path}`;
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('EXPO_PUBLIC_API_BASE_URL is required for native Oura connections.');
  return `${base}${path}`;
}
