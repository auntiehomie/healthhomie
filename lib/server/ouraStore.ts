import { randomUUID } from 'node:crypto';
import { getSql } from './db';
import { refreshOuraToken, type OuraTokenResponse } from '../services/ouraApi';
import type { HealthMetricsDaily } from '../../types/healthhomie';

type OuraConnectionRow = {
  status: string;
  scopes: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  lastSyncedAt: string | null;
};

export async function storeOuraTokens(userId: string, token: OuraTokenResponse): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await sql`
    INSERT INTO health_connections (id, "userId", provider, status, scopes, "accessToken", "refreshToken", "expiresAt", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, 'oura', 'connected', ${token.scope ?? null}, ${token.access_token}, ${token.refresh_token}, ${expiresAt}, ${now}, ${now})
    ON CONFLICT ("userId", provider) DO UPDATE SET
      status = 'connected', scopes = EXCLUDED.scopes, "accessToken" = EXCLUDED."accessToken",
      "refreshToken" = EXCLUDED."refreshToken", "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = EXCLUDED."updatedAt"
  `;
}

export async function getOuraConnection(userId: string): Promise<OuraConnectionRow | null> {
  const sql = getSql();
  const rows = await sql`SELECT status, scopes, "accessToken", "refreshToken", "expiresAt", "lastSyncedAt" FROM health_connections WHERE "userId" = ${userId} AND provider = 'oura'`;
  return (rows[0] as OuraConnectionRow | undefined) ?? null;
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
  const sql = getSql();
  await sql`UPDATE health_connections SET "lastSyncedAt" = ${new Date().toISOString()} WHERE "userId" = ${userId} AND provider = 'oura'`;
}

export async function upsertHealthMetrics(userId: string, metrics: HealthMetricsDaily[]): Promise<void> {
  const sql = getSql();
  for (const metric of metrics) {
    await sql`
      INSERT INTO health_metrics_daily ("userId", date, provider, steps, "activeEnergyKcal", "totalEnergyKcal", "sleepScore", "readinessScore")
      VALUES (${userId}, ${metric.date}, ${metric.provider}, ${metric.steps ?? null}, ${metric.activeEnergyKcal ?? null}, ${metric.totalEnergyKcal ?? null}, ${metric.sleepScore ?? null}, ${metric.readinessScore ?? null})
      ON CONFLICT ("userId", date, provider) DO UPDATE SET
        steps = EXCLUDED.steps, "activeEnergyKcal" = EXCLUDED."activeEnergyKcal", "totalEnergyKcal" = EXCLUDED."totalEnergyKcal",
        "sleepScore" = EXCLUDED."sleepScore", "readinessScore" = EXCLUDED."readinessScore"
    `;
  }
}
