import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';
import type { WeightLog } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);
    const sql = getSql();

    if (req.method === 'GET') {
      const days = req.query.days ? Number(req.query.days) : 90;
      const limit = days && Number.isFinite(days) ? days : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - limit);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const entries = await sql`SELECT * FROM weight_logs WHERE "userId" = ${userId} AND date >= ${cutoffStr} ORDER BY date DESC`;
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const entry = (req.body ?? {}) as WeightLog;
      if (!entry.id || !entry.date || entry.weightKg == null) return res.status(400).json({ error: 'id, date, and weightKg are required.' });
      if (entry.weightKg <= 0 || entry.weightKg > 500) return res.status(400).json({ error: 'weightKg must be between 0 and 500.' });
      await sql`
        INSERT INTO weight_logs (id, "userId", date, "weightKg", "createdAt")
        VALUES (${entry.id}, ${userId}, ${entry.date}, ${entry.weightKg}, ${entry.createdAt})
        ON CONFLICT (id) DO UPDATE SET "weightKg" = EXCLUDED."weightKg", date = EXCLUDED.date
      `;
      return res.status(204).end();
    }

    if (req.method === 'DELETE') {
      const entryId = String(req.query.id ?? '').trim();
      if (!entryId) return res.status(400).json({ error: 'id is required.' });
      const deleted = await sql`
        DELETE FROM weight_logs
        WHERE id = ${entryId} AND "userId" = ${userId}
        RETURNING id
      `;
      if (deleted.length === 0) return res.status(404).json({ error: 'Weight log not found.' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({ error: 'GET, POST, or DELETE only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}