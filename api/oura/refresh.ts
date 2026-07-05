import type { VercelRequest, VercelResponse } from '@vercel/node';
import { refreshOuraToken } from '../../lib/services/ouraApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  const refreshToken = req.body?.refresh_token;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh_token.' });

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(503).json({ error: 'Oura is not configured.' });

  try {
    const token = await refreshOuraToken({ refreshToken, clientId, clientSecret });
    res.status(200).json(token);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Oura refresh failed.' });
  }
}
