import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError } from '../../lib/server/auth';
import { getOuraConnection } from '../../lib/server/ouraStore';
import { DatabaseNotConfiguredError } from '../../lib/server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });

  try {
    const userId = requireUserId(req);
    const provider = String(req.query.provider ?? 'oura');
    if (provider !== 'oura') return res.status(400).json({ error: 'Unsupported provider.' });

    const connection = await getOuraConnection(userId);
    if (!connection) return res.status(200).json({ connection: null });
    res.status(200).json({ connection: { status: connection.status, lastSyncedAt: connection.lastSyncedAt, scopes: connection.scopes } });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: 'Failed to load connection status.' });
  }
}
