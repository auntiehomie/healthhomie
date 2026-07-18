import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError } from '../../lib/server/auth';
import { fetchFitbitDailyMetrics } from '../../lib/services/fitbitApi';
import { ensureFreshFitbitAccessToken, markFitbitSynced } from '../../lib/server/fitbitStore';
import { upsertHealthMetrics } from '../../lib/server/healthMetricsStore';
import { DatabaseNotConfiguredError } from '../../lib/server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  try {
    const userId = requireUserId(req);
    const accessToken = await ensureFreshFitbitAccessToken(userId);

    const end = String(req.query.end ?? new Date().toISOString().slice(0, 10));
    const start = String(req.query.start ?? defaultStart(end));

    const metrics = await fetchFitbitDailyMetrics({ accessToken, start, end });
    await upsertHealthMetrics(userId, metrics);
    await markFitbitSynced(userId);

    res.status(200).json({ metrics });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(502).json({ error: error instanceof Error ? error.message : 'Fitbit sync failed.' });
  }
}

function defaultStart(end: string): string {
  const date = new Date(end);
  date.setDate(date.getDate() - 14);
  return date.toISOString().slice(0, 10);
}
