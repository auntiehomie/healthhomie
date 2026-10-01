import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError, ForbiddenError } from '../../lib/server/auth';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import type { HealthProvider } from '../../types/healthhomie';

/**
 * DELETE /api/health-connections?provider=fitbit|oura
 * Disconnects a health provider — revokes tokens by clearing them from the database
 * and marking the connection as 'disconnected'. The user must re-authenticate to reconnect.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only.' });

  let userId: string;
  try {
    userId = requireUserId(req);
  } catch (error) {
    if (error instanceof ForbiddenError) return res.status(403).json({ error: error.message });
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Unauthorized.' });
  }

  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const provider = url.searchParams.get('provider') as HealthProvider | null;
  if (!provider || !['fitbit', 'oura'].includes(provider)) {
    return res.status(400).json({ error: 'Valid provider required (fitbit or oura).' });
  }

  try {
    const sql = getSql();
    await sql`
      UPDATE health_connections
      SET status = 'disconnected',
          "accessToken" = NULL,
          "refreshToken" = NULL,
          "updatedAt" = ${new Date().toISOString()}
      WHERE "userId" = ${userId} AND provider = ${provider}
    `;
    res.status(200).json({ message: `${provider} disconnected successfully.` });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Disconnect failed.' });
  }
}
