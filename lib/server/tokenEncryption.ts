import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Application-layer encryption for sensitive tokens (health provider OAuth tokens, etc.)
 * stored in the database. Uses AES-256-GCM with a per-token random IV.
 *
 * Requires TOKEN_ENCRYPTION_KEY env var (32-byte hex or base64 string).
 * If not configured, tokens are stored as-is (legacy behaviour) so the app
 * doesn't break during rollout. A warning is logged on server start.
 */

const KEY_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard IV length

let cachedKey: Buffer | null = null;
let keyWarningLogged = false;

function getEncryptionKey(): Buffer | null {
  if (cachedKey !== null) return cachedKey;
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    if (!keyWarningLogged) {
      console.warn('[security] TOKEN_ENCRYPTION_KEY not set — health provider tokens stored unencrypted. Set TOKEN_ENCRYPTION_KEY to enable encryption.');
      keyWarningLogged = true;
    }
    return null;
  }
  // Accept hex (64 chars) or base64
  try {
    cachedKey = raw.match(/^[0-9a-fA-F]{64}$/) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
    if (cachedKey.length !== 32) throw new Error('key must be 32 bytes');
  } catch {
    console.error('[security] TOKEN_ENCRYPTION_KEY is set but invalid — must be 32 bytes (hex or base64). Tokens stored unencrypted.');
    return null;
  }
  return cachedKey;
}

/** Encrypts a plaintext string. Returns `enc:<hex-iv>:<hex-ciphertext>:<hex-tag>` or the original if key is missing. */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext; // Graceful degradation during rollout
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(KEY_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/** Decrypts a token encrypted by encryptToken. Returns the original plaintext. */
export function decryptToken(stored: string): string {
  if (!stored.startsWith('enc:')) return stored; // Not encrypted (legacy or key missing)
  const key = getEncryptionKey();
  if (!key) {
    throw new Error('Token is encrypted but TOKEN_ENCRYPTION_KEY is not set. Cannot decrypt.');
  }
  const parts = stored.split(':');
  if (parts.length !== 4) throw new Error('Malformed encrypted token.');
  const iv = Buffer.from(parts[1], 'hex');
  const ciphertext = Buffer.from(parts[2], 'hex');
  const tag = Buffer.from(parts[3], 'hex');
  const decipher = createDecipheriv(KEY_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Check if encryption is enabled (key is configured and valid). */
export function isEncryptionEnabled(): boolean {
  return getEncryptionKey() !== null;
}
