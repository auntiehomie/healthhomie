import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { schemaStatements } from '../../lib/server/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'GET or POST only.' });

  // Prefer a dedicated ADMIN_SECRET so this endpoint no longer shares a secret with anything
  // that's handed out for registration (invite codes replaced that for everyone but the owner).
  const expectedSecret = process.env.ADMIN_SECRET ?? process.env.SIGNUP_SECRET;
  if (!expectedSecret) return res.status(503).json({ error: 'ADMIN_SECRET is not configured.' });
  const providedSecret = req.headers['x-migrate-secret'] ?? req.query.secret;
  if (providedSecret !== expectedSecret) return res.status(403).json({ error: 'Forbidden.' });

  try {
    const sql = getSql();
    for (const statement of schemaStatements) {
      await sql.query(statement);
    }
    res.status(200).json({ ok: true, statementsRun: schemaStatements.length });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Migration failed.' });
  }
}
