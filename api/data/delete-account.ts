import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';

/**
 * DELETE /api/data/delete-account
 *
 * Permanently deletes the authenticated user and all associated data (food items,
 * meal entries, profile, health connections, metrics, survey responses, recipes,
 * notes, invite codes, etc.) via CASCADE.
 *
 * GDPR/CCPA compliance: users can request full deletion of their personal data
 * directly from the app settings, with no manual review process required.
 *
 * Body: { confirmation: string }
 * The confirmation field must exactly match the user's email address to prevent
 * accidental deletion. The server fetches the email from the database and compares.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only.' });

  try {
    const userId = requireUserId(req);
    const { confirmation } = (req.body ?? {}) as { confirmation?: string };

    if (typeof confirmation !== 'string' || !confirmation.trim()) {
      return res.status(400).json({ error: 'Email confirmation is required to delete your account.' });
    }

    const sql = getSql();

    // Verify the user exists and the confirmation email matches
    const rows = await sql`SELECT id, email FROM users WHERE id = ${userId}`;
    const user = rows[0] as { id: string; email: string } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.email.toLowerCase() !== confirmation.trim().toLowerCase()) {
      return res.status(400).json({ error: 'The confirmation email does not match your account email.' });
    }

    // Delete the user row — all related data cascades via ON DELETE CASCADE
    await sql`DELETE FROM users WHERE id = ${userId}`;

    res.status(200).json({ message: 'Your account and all associated data have been permanently deleted.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete account.' });
  }
}