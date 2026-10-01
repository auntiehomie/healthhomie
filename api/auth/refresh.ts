import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signAuthToken, verifyRefreshToken, AuthError } from '../../lib/server/auth';
import { authRateLimit } from '../../lib/server/rateLimit';

/**
 * POST /api/auth/refresh
 * Body: { refreshToken: string }
 * Returns: { token: string } — a new short-lived access token.
 *
 * The client stores the refresh token (30d TTL) and sends it here
 * when the access token (24h TTL) expires, avoiding repeated logins
 * while keeping access tokens short-lived and revocable.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });
  if (authRateLimit(req, res)) return;

  const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return res.status(400).json({ error: 'Refresh token required.' });
  }

  try {
    const { userId, isOwner } = verifyRefreshToken(refreshToken);
    res.status(200).json({ token: signAuthToken(userId, isOwner) });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    res.status(500).json({ error: 'Token refresh failed.' });
  }
}
