import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { signAuthToken, verifyPassword } from '../../lib/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password required.' });

  try {
    const sql = getSql();
    const rows = await sql`SELECT id, "passwordHash", "isOwner" FROM users WHERE email = ${email.trim().toLowerCase()}`;
    const user = rows[0] as { id: string; passwordHash: string; isOwner: boolean } | undefined;
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.status(200).json({ token: signAuthToken(user.id, user.isOwner) });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Login failed.' });
  }
}
