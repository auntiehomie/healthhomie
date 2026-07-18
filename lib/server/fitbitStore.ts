import { refreshFitbitToken, type FitbitTokenResponse } from '../services/fitbitApi';
import { getHealthConnection, storeHealthConnectionTokens, markHealthConnectionSynced } from './healthConnectionsStore';

export async function storeFitbitTokens(userId: string, token: FitbitTokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await storeHealthConnectionTokens(userId, 'fitbit', {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    scope: token.scope,
  });
}

export async function getFitbitConnection(userId: string) {
  return getHealthConnection(userId, 'fitbit');
}

export async function ensureFreshFitbitAccessToken(userId: string): Promise<string> {
  const connection = await getFitbitConnection(userId);
  if (!connection?.accessToken || !connection.refreshToken) throw new Error('Fitbit is not connected.');

  const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  if (Date.now() < expiresAt - 60_000) return connection.accessToken;

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Fitbit is not configured.');

  const refreshed = await refreshFitbitToken({ refreshToken: connection.refreshToken, clientId, clientSecret });
  await storeFitbitTokens(userId, refreshed);
  return refreshed.access_token;
}

export async function markFitbitSynced(userId: string): Promise<void> {
  await markHealthConnectionSynced(userId, 'fitbit');
}
