import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireOwner, AuthError, ForbiddenError } from '../../lib/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  try {
    // Only an existing owner can mint another owner — this is the deliberate replacement for
    // sharing SIGNUP_SECRET (a static, reusable secret) just to add a second admin.
    requireOwner(req);
    const { email } = (req.body ?? {}) as { email?: string };
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });

    const sql = getSql();
    const normalizedEmail = email.trim().toLowerCase();
    const rows = await sql`UPDATE users SET "isOwner" = TRUE WHERE email = ${normalizedEmail} RETURNING email`;
    if (rows.length === 0) return res.status(404).json({ error: 'No account found with that email.' });

    res.status(200).json({ email: rows[0].email });
  } catch (error) {
    if (error instanceof ForbiddenError) return res.status(403).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Promotion failed.' });
  }
}
