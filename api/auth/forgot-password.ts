import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { createPasswordResetToken } from '../../lib/server/passwordResetStore';
import { sendEmail, EmailNotConfiguredError } from '../../lib/server/email';

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a link to reset the password.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  const { email } = (req.body ?? {}) as { email?: string };
  if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });

  try {
    const sql = getSql();
    const rows = await sql`SELECT id FROM users WHERE email = ${email.trim().toLowerCase()}`;
    const user = rows[0] as { id: string } | undefined;

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
      const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
      const resetUrl = `${proto}://${host}/reset-password?token=${token}`;
      await sendEmail({
        to: email.trim().toLowerCase(),
        subject: 'Reset your Howdy Morning password',
        html: `<p>Someone (hopefully you) asked to reset the password for this Howdy Morning account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
      });
    }

    res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    if (error instanceof EmailNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send reset email.' });
  }
}
