import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';
import type { HealthSnapshot } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only.' });

  try {
    const userId = requireUserId(req);
    const sql = getSql();

    // Any connected provider (Oura today, Apple Health/others later) writes into this table keyed
    // by (userId, date, provider) — merge every row for the most recent date so the app shows one
    // combined snapshot regardless of which source actually has each field.
    const rows = await sql`
      SELECT * FROM health_metrics_daily
      WHERE "userId" = ${userId} AND date = (
        SELECT MAX(date) FROM health_metrics_daily WHERE "userId" = ${userId}
      )
    `;

    if (rows.length === 0) return res.status(200).json({ date: new Date().toISOString().slice(0, 10) } satisfies HealthSnapshot);

    const snapshot: HealthSnapshot = { date: rows[0].date };
    for (const row of rows) {
      if (snapshot.steps == null && row.steps != null) snapshot.steps = row.steps;
      if (snapshot.activeEnergyKcal == null && row.activeEnergyKcal != null) snapshot.activeEnergyKcal = row.activeEnergyKcal;
      if (snapshot.weightKg == null && row.weightKg != null) snapshot.weightKg = row.weightKg;
      if (snapshot.sleepMinutes == null && row.sleepMinutes != null) snapshot.sleepMinutes = row.sleepMinutes;
      if (snapshot.workouts == null && row.workouts != null) snapshot.workouts = row.workouts;
    }

    res.status(200).json(snapshot);
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
