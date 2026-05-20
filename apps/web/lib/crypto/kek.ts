/**
 * Password → Key Encryption Key (KEK) derivation.
 * Used to encrypt the private-key bundle at rest in IndexedDB AND on the
 * server (so a user can log in on a new device and recover their keys).
 *
 * Why PBKDF2 in-browser (not argon2)? Web Crypto supports PBKDF2 natively
 * — no WASM hit. 600k iterations is OWASP-current.
 */
import { fromBase64, toBase64, utf8 } from './encoding';

const ITERATIONS = 600_000;

async function deriveKek(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', utf8(password), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedBundle {
  ciphertext: string;
  iv: string;
  kdfSalt: string;
  kdfIterations: number;
}

export async function encryptKeyBundle(plaintext: Uint8Array, password: string): Promise<EncryptedBundle> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const kek = await deriveKek(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, plaintext);
  return {
    ciphertext: toBase64(new Uint8Array(ct)),
    iv: toBase64(iv),
    kdfSalt: toBase64(salt),
    kdfIterations: ITERATIONS,
  };
}

export async function decryptKeyBundle(bundle: EncryptedBundle, password: string): Promise<Uint8Array> {
  const kek = await deriveKek(password, fromBase64(bundle.kdfSalt));
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(bundle.iv) },
    kek,
    fromBase64(bundle.ciphertext),
  );
  return new Uint8Array(pt);
}
