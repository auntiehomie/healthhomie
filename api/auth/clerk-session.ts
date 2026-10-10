import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClerkClient } from "@clerk/backend";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { getSql } from "../../lib/server/db";
import { hashPassword } from "../../lib/server/auth";

/** Only a server-verified Clerk identity may attach to an existing verified email. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only." });
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const jwtSecret = process.env.AUTH_JWT_SECRET;
  const origin = process.env.APP_ORIGIN;
  if (!secretKey || !publishableKey || !jwtSecret || !origin)
    return res
      .status(503)
      .json({ error: "Sign-in is not configured. Contact support." });
  try {
    const clerk = createClerkClient({ secretKey, publishableKey });
    const headers = new Headers();
    if (req.headers.authorization)
      headers.set("authorization", req.headers.authorization);
    const state = await clerk.authenticateRequest(
      new Request(`${origin}/api/auth/clerk-session`, { headers }),
      {
        authorizedParties: [new URL(origin).origin],
        acceptsToken: "session_token",
      },
    );
    const auth = state.toAuth();
    if (!auth?.userId)
      return res.status(401).json({ error: "Please sign in again." });
    const identity = await clerk.users.getUser(auth.userId);
    const primary = identity.emailAddresses.find(
      (email) => email.id === identity.primaryEmailAddressId,
    );
    if (!primary || primary.verification?.status !== "verified")
      return res
        .status(403)
        .json({ error: "Verify your email before continuing." });
    const sql = getSql();
    // First use the immutable provider ID, even if the primary email has since changed.
    let rows =
      await sql`SELECT id, "isOwner" FROM users WHERE "clerkUserId" = ${identity.id}`;
    if (!rows.length) {
      const email = primary.emailAddress.trim().toLowerCase();
      const passwordHash = await hashPassword(randomUUID() + randomUUID());
      rows = await sql`
        INSERT INTO users (id, email, "passwordHash", "isOwner", "createdAt", "clerkUserId")
        VALUES (${randomUUID()}, ${email}, ${passwordHash}, false, ${new Date().toISOString()}, ${identity.id})
        ON CONFLICT (email) DO UPDATE SET "clerkUserId" = EXCLUDED."clerkUserId"
        WHERE users."clerkUserId" IS NULL OR users."clerkUserId" = EXCLUDED."clerkUserId"
        RETURNING id, "isOwner"
      `;
    }
    if (!rows.length)
      return res
        .status(409)
        .json({
          error: "This email is linked to another account. Contact support.",
        });
    const user = rows[0] as { id: string; isOwner: boolean };
    // Transitional compatibility with existing synchronous API guards; no long-lived token.
    const token = jwt.sign({ sub: user.id, isOwner: user.isOwner }, jwtSecret, {
      expiresIn: "5m",
    });
    return res.status(200).json({ token });
  } catch {
    return res
      .status(503)
      .json({
        error:
          "Unable to connect your account. Please try again or contact support.",
      });
  }
}
