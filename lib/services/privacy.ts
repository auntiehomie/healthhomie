import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS = 100_000;
const KEY_SIZE_WORDS = 256 / 32;

/**
 * Passphrase-based encryption for fields that shouldn't be readable by the
 * server or anyone with database access — only the person who set the
 * passphrase can decrypt it, since the passphrase itself is never sent or stored.
 */
export type EncryptedField = { ciphertext: string; salt: string; iv: string };

async function randomHex(byteLength: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(byteLength);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function encryptWithPassphrase(plaintext: string, passphrase: string): Promise<EncryptedField> {
  const salt = await randomHex(16);
  const iv = await randomHex(16);
  const key = CryptoJS.PBKDF2(passphrase, CryptoJS.enc.Hex.parse(salt), { keySize: KEY_SIZE_WORDS, iterations: PBKDF2_ITERATIONS });
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return { ciphertext: encrypted.toString(), salt, iv };
}

/** Returns null if the passphrase is wrong (or the data is corrupt) rather than throwing. */
export function decryptWithPassphrase(field: EncryptedField, passphrase: string): string | null {
  try {
    const key = CryptoJS.PBKDF2(passphrase, CryptoJS.enc.Hex.parse(field.salt), { keySize: KEY_SIZE_WORDS, iterations: PBKDF2_ITERATIONS });
    const decrypted = CryptoJS.AES.decrypt(field.ciphertext, key, {
      iv: CryptoJS.enc.Hex.parse(field.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
