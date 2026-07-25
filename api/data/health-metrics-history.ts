import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

export type HealthMetricsHistoryDay = { date: string; readinessScore?: number; sleepScore?: number };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });

  try {
    const userId = requireUserId(req);
    const sql = getSql();

    const daysParam = Number(req.query.days);
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, MAX_DAYS) : DEFAULT_DAYS;
    const start = new Date();
    start.setDate(start.getDate() - days);
    const startDate = start.toISOString().slice(0, 10);

    const rows = await sql`
      SELECT date, "readinessScore", "sleepScore" FROM health_metrics_daily
      WHERE "userId" = ${userId} AND date >= ${startDate}
      ORDER BY date ASC
    `;

    // Multiple providers can write a row for the same date - merge them so each date appears once,
    // preferring the first non-null value found (same merge approach as /api/data/health-metrics).
    const byDate = new Map<string, HealthMetricsHistoryDay>();
    for (const row of rows) {
      const existing: HealthMetricsHistoryDay = byDate.get(row.date) ?? { date: row.date };
      if (existing.readinessScore == null && row.readinessScore != null) existing.readinessScore = row.readinessScore;
      if (existing.sleepScore == null && row.sleepScore != null) existing.sleepScore = row.sleepScore;
      byDate.set(row.date, existing);
    }

    res.status(200).json({ metrics: Array.from(byDate.values()) });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
