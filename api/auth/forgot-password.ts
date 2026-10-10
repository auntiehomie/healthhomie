import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql, DatabaseNotConfiguredError } from "../../lib/server/db";
import { createPasswordResetToken } from "../../lib/server/passwordResetStore";
import { sendEmail, EmailNotConfiguredError } from "../../lib/server/email";
import { passwordResetRateLimit } from "../../lib/server/rateLimit";

const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent a link to reset the password.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only." });
  if (passwordResetRateLimit(req, res)) return;
  // Check delivery configuration before looking up the account, to avoid revealing its existence.
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL.includes("@resend.dev") ||
    !process.env.APP_ORIGIN
  ) {
    return res
      .status(503)
      .json({
        error:
          "Password recovery is temporarily unavailable. Please contact support.",
        supportUrl: "/support",
      });
  }

  const { email } = (req.body ?? {}) as { email?: string };
  if (typeof email !== "string" || !email.includes("@"))
    return res.status(400).json({ error: "Valid email required." });

  try {
    const sql = getSql();
    const rows =
      await sql`SELECT id FROM users WHERE email = ${email.trim().toLowerCase()} AND (to_jsonb(users)->>'clerkUserId') IS NULL`;
    const user = rows[0] as { id: string } | undefined;

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.APP_ORIGIN}/reset-password?token=${token}`;
      await sendEmail({
        to: email.trim().toLowerCase(),
        subject: "Reset your Howdy Morning password",
        html: `<p>Someone (hopefully you) asked to reset the password for this Howdy Morning account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
      });
    }

    res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError)
      return res.status(503).json({ error: error.message });
    if (error instanceof EmailNotConfiguredError)
      return res.status(503).json({ error: error.message });
    res
      .status(503)
      .json({
        error:
          "Password recovery is temporarily unavailable. Please contact support.",
        supportUrl: "/support",
      });
  }
}
