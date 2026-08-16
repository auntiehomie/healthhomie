import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';

/**
 * DELETE /api/user/data-deletion
 *
 * Permanently deletes the authenticated user's health data while keeping the account
 * (email + password) intact. Removes:
 *   - health_connections      (Oura / Fitbit OAuth tokens, incl. access + refresh tokens)
 *   - health_metrics_daily    (synced steps, sleep, readiness, activity, HRV, SpO2, ...)
 *   - user_profile            (body stats / goal profile)
 *   - survey_responses        (health survey responses)
 *   - ai_suggestions_daily    (daily AI health suggestions)
 *
 * The user's food journal, meal entries, notes, and recipes are intentionally left in
 * place — full account deletion is available separately via /api/data/delete-account.
 *
 * GDPR/CCPA compliance: users can request erasure of their health data directly from
 * app settings, with no manual review process required.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only.' });

  try {
    const userId = requireUserId(req);
    const sql = getSql();

    // Connected-provider OAuth tokens (Oura + Fitbit) — this is where Oura's
    // access/refresh tokens live, so removing these revokes the app's access.
    await sql`DELETE FROM health_connections WHERE "userId" = ${userId}`;
    // Synced provider metrics.
    await sql`DELETE FROM health_metrics_daily WHERE "userId" = ${userId}`;
    // Body stats / goal profile (re-created with starter defaults on next load).
    await sql`DELETE FROM user_profile WHERE "userId" = ${userId}`;
    // Health survey responses.
    await sql`DELETE FROM survey_responses WHERE "userId" = ${userId}`;
    // Daily AI health suggestions.
    await sql`DELETE FROM ai_suggestions_daily WHERE "userId" = ${userId}`;

    res.status(200).json({ message: 'Your health data has been permanently deleted.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete your data.' });
  }
}
