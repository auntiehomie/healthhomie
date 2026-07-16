import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getSql } from './db';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const sql = getSql();
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  await sql`
    INSERT INTO password_reset_tokens (id, "userId", "tokenHash", "expiresAt", "createdAt")
    VALUES (${randomUUID()}, ${userId}, ${hashToken(token)}, ${new Date(now.getTime() + TOKEN_TTL_MS).toISOString()}, ${now.toISOString()})
  `;
  return token;
}

/** Returns the userId for a still-valid, unused token, or null if it's missing/expired/already used. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`
    UPDATE password_reset_tokens SET "usedAt" = ${new Date().toISOString()}
    WHERE "tokenHash" = ${hashToken(token)} AND "usedAt" IS NULL AND "expiresAt" > ${new Date().toISOString()}
    RETURNING "userId"
  `;
  return (rows[0] as { userId: string } | undefined)?.userId ?? null;
}
