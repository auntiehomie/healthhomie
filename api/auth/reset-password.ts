import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql, DatabaseNotConfiguredError } from "../../lib/server/db";
import { hashPassword } from "../../lib/server/auth";
import { consumePasswordResetToken } from "../../lib/server/passwordResetStore";
import { passwordResetRateLimit } from "../../lib/server/rateLimit";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only." });
  if (passwordResetRateLimit(req, res)) return;

  const { token, password } = (req.body ?? {}) as {
    token?: string;
    password?: string;
  };
  if (typeof token !== "string" || !token)
    return res.status(400).json({ error: "Reset token required." });
  if (typeof password !== "string" || password.length < 8)
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters." });

  try {
    const userId = await consumePasswordResetToken(token);
    if (!userId)
      return res
        .status(400)
        .json({
          error:
            "This reset link is invalid or has expired. Request a new one.",
        });

    const sql = getSql();
    const passwordHash = await hashPassword(password);
    const updated =
      await sql`UPDATE users SET "passwordHash" = ${passwordHash} WHERE id = ${userId} AND (to_jsonb(users)->>'clerkUserId') IS NULL RETURNING id`;
    if (!updated.length)
      return res
        .status(400)
        .json({
          error: "Use the current sign-in screen to recover your account.",
        });

    res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError)
      return res.status(503).json({ error: error.message });
    res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Failed to reset password.",
      });
  }
}
