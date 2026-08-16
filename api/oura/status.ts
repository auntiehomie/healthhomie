import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError } from '../../lib/server/auth';
import { ensureFreshOuraAccessToken, getOuraConnection, OuraReauthRequiredError } from '../../lib/server/ouraStore';
import { DatabaseNotConfiguredError } from '../../lib/server/db';

/**
 * GET /api/oura/status
 *
 * Reports whether Oura is connected and — unlike the generic health-connections
 * read — actually probes the stored token's freshness so the client can surface a
 * "Reconnect Oura" prompt when the refresh token has expired and re-auth is needed.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });

  try {
    const userId = requireUserId(req);
    const connection = await getOuraConnection(userId);
    if (!connection?.accessToken || !connection.refreshToken) {
      return res.status(200).json({ connected: false });
    }

    try {
      await ensureFreshOuraAccessToken(userId);
      return res.status(200).json({ connected: true, lastSyncedAt: connection.lastSyncedAt ?? undefined, reauthRequired: false });
    } catch (error) {
      if (error instanceof OuraReauthRequiredError) {
        return res.status(200).json({ connected: true, lastSyncedAt: connection.lastSyncedAt ?? undefined, reauthRequired: true });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check Oura status.' });
  }
}
