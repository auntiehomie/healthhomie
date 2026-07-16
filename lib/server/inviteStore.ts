import { randomBytes, randomUUID } from 'node:crypto';
import { getSql } from './db';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L to avoid transcription errors
const CODE_LENGTH = 8;

export type InviteCode = {
  id: string;
  code: string;
  label: string | null;
  usedByEmail: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return code;
}

export async function createInviteCode(createdByUserId: string, label?: string): Promise<InviteCode> {
  const sql = getSql();
  const id = randomUUID();
  const code = generateCode();
  const now = new Date().toISOString();
  await sql`
    INSERT INTO invite_codes (id, code, label, "createdByUserId", "createdAt")
    VALUES (${id}, ${code}, ${label ?? null}, ${createdByUserId}, ${now})
  `;
  return { id, code, label: label ?? null, usedByEmail: null, usedAt: null, revokedAt: null, createdAt: now };
}

export async function listInviteCodes(createdByUserId: string): Promise<InviteCode[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ic.id, ic.code, ic.label, ic."usedAt", ic."revokedAt", ic."createdAt", u.email AS "usedByEmail"
    FROM invite_codes ic
    LEFT JOIN users u ON u.id = ic."usedByUserId"
    WHERE ic."createdByUserId" = ${createdByUserId}
    ORDER BY ic."createdAt" DESC
  `;
  return rows as InviteCode[];
}

/** Returns false if the code doesn't exist, is already used, or was revoked — callers should treat that as an invalid code. */
export async function revokeInviteCode(createdByUserId: string, id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE invite_codes SET "revokedAt" = ${new Date().toISOString()}
    WHERE id = ${id} AND "createdByUserId" = ${createdByUserId} AND "usedAt" IS NULL AND "revokedAt" IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

/** Atomically marks a still-valid code used by this new user; returns false if the code is invalid/used/revoked. */
export async function consumeInviteCode(code: string, usedByUserId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE invite_codes SET "usedByUserId" = ${usedByUserId}, "usedAt" = ${new Date().toISOString()}
    WHERE code = ${code.trim().toUpperCase()} AND "usedAt" IS NULL AND "revokedAt" IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}
