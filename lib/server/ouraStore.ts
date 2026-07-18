import { refreshOuraToken, type OuraTokenResponse } from '../services/ouraApi';
import { getHealthConnection, storeHealthConnectionTokens, markHealthConnectionSynced } from './healthConnectionsStore';

export async function storeOuraTokens(userId: string, token: OuraTokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await storeHealthConnectionTokens(userId, 'oura', {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    scope: token.scope,
  });
}

export async function getOuraConnection(userId: string) {
  return getHealthConnection(userId, 'oura');
}

export async function ensureFreshOuraAccessToken(userId: string): Promise<string> {
  const connection = await getOuraConnection(userId);
  if (!connection?.accessToken || !connection.refreshToken) throw new Error('Oura is not connected.');

  const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  if (Date.now() < expiresAt - 60_000) return connection.accessToken;

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Oura is not configured.');

  const refreshed = await refreshOuraToken({ refreshToken: connection.refreshToken, clientId, clientSecret });
  await storeOuraTokens(userId, refreshed);
  return refreshed.access_token;
}

export async function markOuraSynced(userId: string): Promise<void> {
  await markHealthConnectionSynced(userId, 'oura');
}
