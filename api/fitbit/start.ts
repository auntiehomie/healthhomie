import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError, signOAuthState } from '../../lib/server/auth';
import { buildFitbitAuthorizeUrl } from '../../lib/services/fitbitApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  try {
    const userId = requireUserId(req);
    const clientId = process.env.FITBIT_CLIENT_ID;
    const redirectUri = process.env.FITBIT_REDIRECT_URI;
    if (!clientId || !redirectUri) return res.status(503).json({ error: 'FITBIT_CLIENT_ID/FITBIT_REDIRECT_URI are not configured.' });

    const state = signOAuthState(userId);
    res.status(200).json({ authorizeUrl: buildFitbitAuthorizeUrl({ clientId, redirectUri, state }) });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    res.status(500).json({ error: 'Failed to start Fitbit connection.' });
  }
}
