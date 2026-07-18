import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError } from '../../lib/server/auth';
import { getHealthConnection } from '../../lib/server/healthConnectionsStore';
import { DatabaseNotConfiguredError } from '../../lib/server/db';
import type { HealthProvider } from '../../types/healthhomie';

const SUPPORTED_PROVIDERS: HealthProvider[] = ['oura', 'fitbit'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });

  try {
    const userId = requireUserId(req);
    const provider = String(req.query.provider ?? 'oura') as HealthProvider;
    if (!SUPPORTED_PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Unsupported provider.' });

    const connection = await getHealthConnection(userId, provider);
    if (!connection) return res.status(200).json({ connection: null });
    res.status(200).json({ connection: { status: connection.status, lastSyncedAt: connection.lastSyncedAt, scopes: connection.scopes } });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: 'Failed to load connection status.' });
  }
}
