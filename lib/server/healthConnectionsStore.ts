import { randomUUID } from 'node:crypto';
import { getSql } from './db';
import type { HealthProvider } from '../../types/healthhomie';

export type HealthConnectionRow = {
  status: string;
  scopes: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  lastSyncedAt: string | null;
};

/** Shared by every OAuth-based provider (Oura, Fitbit, ...) — same table, keyed by (userId, provider). */
export async function getHealthConnection(userId: string, provider: HealthProvider): Promise<HealthConnectionRow | null> {
  const sql = getSql();
  const rows = await sql`SELECT status, scopes, "accessToken", "refreshToken", "expiresAt", "lastSyncedAt" FROM health_connections WHERE "userId" = ${userId} AND provider = ${provider}`;
  return (rows[0] as HealthConnectionRow | undefined) ?? null;
}

export async function storeHealthConnectionTokens(
  userId: string,
  provider: HealthProvider,
  token: { accessToken: string; refreshToken: string; expiresAt: string; scope?: string }
): Promise<void> {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO health_connections (id, "userId", provider, status, scopes, "accessToken", "refreshToken", "expiresAt", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, ${provider}, 'connected', ${token.scope ?? null}, ${token.accessToken}, ${token.refreshToken}, ${token.expiresAt}, ${now}, ${now})
    ON CONFLICT ("userId", provider) DO UPDATE SET
      status = 'connected', scopes = EXCLUDED.scopes, "accessToken" = EXCLUDED."accessToken",
      "refreshToken" = EXCLUDED."refreshToken", "expiresAt" = EXCLUDED."expiresAt", "updatedAt" = EXCLUDED."updatedAt"
  `;
}

export async function markHealthConnectionSynced(userId: string, provider: HealthProvider): Promise<void> {
  const sql = getSql();
  await sql`UPDATE health_connections SET "lastSyncedAt" = ${new Date().toISOString()} WHERE "userId" = ${userId} AND provider = ${provider}`;
}
