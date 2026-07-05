import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchOuraDailyMetrics } from '../../lib/services/ouraApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!accessToken) return res.status(401).json({ error: 'Missing bearer access token.' });

  const end = String(req.query.end ?? new Date().toISOString().slice(0, 10));
  const start = String(req.query.start ?? defaultStart(end));

  try {
    const metrics = await fetchOuraDailyMetrics({ accessToken, start, end });
    res.status(200).json({ metrics });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Oura sync failed.' });
  }
}

function defaultStart(end: string): string {
  const date = new Date(end);
  date.setDate(date.getDate() - 14);
  return date.toISOString().slice(0, 10);
}
