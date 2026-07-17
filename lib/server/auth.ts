import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';

const TOKEN_TTL = '365d';

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(userId: string, isOwner: boolean): string {
  const secret = requireJwtSecret();
  return jwt.sign({ sub: userId, isOwner }, secret, { expiresIn: TOKEN_TTL });
}

function verifyBearerToken(req: VercelRequest): { userId: string; isOwner: boolean } {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) throw new AuthError('Missing bearer token.');

  const secret = requireJwtSecret();
  try {
    const payload = jwt.verify(token, secret) as { sub: string; isOwner?: boolean };
    return { userId: payload.sub, isOwner: !!payload.isOwner };
  } catch {
    throw new AuthError('Invalid or expired session. Please log in again.');
  }
}

/** Throws AuthError on any missing/invalid/expired token — callers should catch and return 401. */
export function requireUserId(req: VercelRequest): string {
  return verifyBearerToken(req).userId;
}

/**
 * Same as requireUserId, but also requires the isOwner claim from login/register time.
 * Throws ForbiddenError (map to 403) for a valid-but-non-owner session, AuthError (401) otherwise.
 */
export function requireOwner(req: VercelRequest): string {
  const { userId, isOwner } = verifyBearerToken(req);
  if (!isOwner) throw new ForbiddenError('Only the app owner can do this.');
  return userId;
}

function requireJwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new AuthError('AUTH_JWT_SECRET is not configured.');
  return secret;
}

/**
 * Short-lived, single-purpose token carried through an OAuth `state` param.
 * Reuses AUTH_JWT_SECRET since it's server-only signing, never exposed to a client.
 */
export function signOAuthState(userId: string): string {
  const secret = requireJwtSecret();
  return jwt.sign({ sub: userId, purpose: 'oauth-state' }, secret, { expiresIn: '10m' });
}

export function verifyOAuthState(state: string): { userId: string } {
  const secret = requireJwtSecret();
  try {
    const payload = jwt.verify(state, secret) as { sub: string; purpose: string };
    if (payload.purpose !== 'oauth-state') throw new Error('wrong token purpose');
    return { userId: payload.sub };
  } catch {
    throw new AuthError('Invalid or expired OAuth state.');
  }
}
