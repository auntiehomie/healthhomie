import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { verifyAuthToken } from '../../lib/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const userId = verifyAuthToken(token);
    if (!userId) return res.status(401).json({ error: 'Invalid token.' });

    const sql = getSql();
    const rows = await sql`
      SELECT status, expires_at, subscribed_at
      FROM pro_subscribers
      WHERE user_id = ${userId}
      ORDER BY subscribed_at DESC
      LIMIT 1
    `;
    const sub = rows[0] as { status: string; expires_at: Date | null; subscribed_at: Date } | undefined;

    if (!sub) return res.status(200).json({ isPro: false });
    if (sub.status === 'active' && (!sub.expires_at || new Date(sub.expires_at) > new Date())) {
      return res.status(200).json({ isPro: true, subscribedAt: sub.subscribed_at, expiresAt: sub.expires_at });
    }
    return res.status(200).json({ isPro: false, expiredAt: sub.expires_at });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to check Pro status.' });
  }
}
