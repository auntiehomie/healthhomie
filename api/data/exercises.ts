import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';
import type { ExerciseEntry } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);
    const sql = getSql();

    if (req.method === 'GET') {
      const date = req.query.date ? String(req.query.date) : undefined;
      const days = req.query.days ? Number(req.query.days) : undefined;
      if (date) {
        const entries = await sql`SELECT * FROM exercise_entries WHERE "userId" = ${userId} AND date = ${date} ORDER BY "createdAt" DESC`;
        return res.status(200).json({ entries });
      }
      if (days && Number.isFinite(days) && days > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        const entries = await sql`SELECT * FROM exercise_entries WHERE "userId" = ${userId} AND date >= ${cutoffStr} ORDER BY date DESC, "createdAt" DESC`;
        return res.status(200).json({ entries });
      }
      const entries = await sql`SELECT * FROM exercise_entries WHERE "userId" = ${userId} ORDER BY date DESC, "createdAt" DESC LIMIT 200`;
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const entry = (req.body ?? {}) as ExerciseEntry;
      if (!entry.id || !entry.type) return res.status(400).json({ error: 'id and type are required.' });
      await sql`
        INSERT INTO exercise_entries (id, "userId", type, "durationMin", "caloriesBurned", date, hour, notes, "createdAt")
        VALUES (${entry.id}, ${userId}, ${entry.type}, ${entry.durationMin}, ${entry.caloriesBurned ?? null}, ${entry.date}, ${entry.hour ?? null}, ${entry.notes ?? null}, ${entry.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
      return res.status(204).end();
    }

    if (req.method === 'DELETE') {
      const entryId = String(req.query.id ?? '').trim();
      if (!entryId) return res.status(400).json({ error: 'id is required.' });
      const deleted = await sql`
        DELETE FROM exercise_entries
        WHERE id = ${entryId} AND "userId" = ${userId}
        RETURNING id
      `;
      if (deleted.length === 0) return res.status(404).json({ error: 'Exercise entry not found.' });
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