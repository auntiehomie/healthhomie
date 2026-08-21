import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { verifyAuthToken } from '../../lib/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const userId = verifyAuthToken(token);
    if (!userId) return res.status(401).json({ error: 'Invalid token.' });

    const sql = getSql();
    // Ensure the table exists
    await sql`
      CREATE TABLE IF NOT EXISTS pro_subscribers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        email TEXT,
        stripe_customer_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Mark as subscribed (placeholder — Stripe integration later)
    const rows = await sql`
      INSERT INTO pro_subscribers (user_id, status, subscribed_at, expires_at)
      VALUES (${userId}, 'active', NOW(), NOW() + INTERVAL '30 days')
      RETURNING subscribed_at, expires_at
    `;
    const sub = rows[0] as { subscribed_at: Date; expires_at: Date } | undefined;

    res.status(200).json({
      isPro: true,
      subscribedAt: sub?.subscribed_at,
      expiresAt: sub?.expires_at,
      message: 'Pro activated! (placeholder — Stripe checkout coming soon)',
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Subscription failed.' });
  }
}
