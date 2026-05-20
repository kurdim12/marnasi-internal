/**
 * Server-side cryptographic primitives.
 *
 * Scope: password hashing, JWT signing, document envelope encryption,
 *        tracking-code verification.
 *
 * NOT in scope: chat/report content. Those are E2EE — server stores ciphertext
 * only and never has the keys.
 */
import { argon2id } from '@noble/hashes/argon2';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { randomBytes } from '@noble/hashes/utils';

const ARGON_PARAMS = { m: 19456, t: 2, p: 1, dkLen: 32 } as const;

const enc = new TextEncoder();
const dec = new TextDecoder();

// ============================================================
// Encoding helpers
// ============================================================
export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}
export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

// ============================================================
// Password hashing — argon2id with pepper
// ============================================================
export function hashPassword(password: string, pepper: string, salt?: Uint8Array): string {
  const useSalt = salt ?? randomBytes(16);
  const peppered = enc.encode(password + ':' + pepper);
  const hash = argon2id(peppered, useSalt, ARGON_PARAMS);
  // Format: argon2id$<saltB64>$<hashB64>
  return `argon2id$${toBase64(useSalt)}$${toBase64(hash)}`;
}

export function verifyPassword(password: string, stored: string, pepper: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'argon2id') return false;
  const salt = fromBase64(parts[1]!);
  const expected = fromBase64(parts[2]!);
  const peppered = enc.encode(password + ':' + pepper);
  const actual = argon2id(peppered, salt, ARGON_PARAMS);
  return constantTimeEqual(expected, actual);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

// ============================================================
// JWT (HS256) — small, dependency-free
// ============================================================
export interface JwtPayload {
  sub: string;          // user id
  email: string;
  role: string;
  iat: number;          // seconds
  exp: number;          // seconds
}

export async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = toBase64Url(enc.encode(JSON.stringify(header)));
  const p = toBase64Url(enc.encode(JSON.stringify(full)));
  const signingInput = `${h}.${p}`;
  const sig = await hmacSha256(secret, signingInput);
  return `${signingInput}.${toBase64Url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts as [string, string, string];
  const signingInput = `${h}.${p}`;
  const expected = await hmacSha256(secret, signingInput);
  const actual = fromBase64Url(s);
  if (!constantTimeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(dec.decode(fromBase64Url(p))) as JwtPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmacSha256(key: string, msg: string): Promise<Uint8Array> {
  return hmac(sha256, enc.encode(key), enc.encode(msg));
}

// ============================================================
// Refresh token — random, stored as argon2 hash
// ============================================================
export function generateRefreshToken(): string {
  return toBase64Url(randomBytes(32));
}

export function hashRefreshToken(token: string, pepper: string): string {
  // Refresh tokens have high entropy; SHA-256 with HMAC is sufficient and fast.
  // No argon2 needed — they're not user-derived.
  const mac = hmac(sha256, enc.encode(pepper), enc.encode(token));
  return toBase64(mac);
}

// ============================================================
// Tracking code (anonymous reports)
// ============================================================
const TRACKING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function generateTrackingCode(): string {
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += TRACKING_ALPHABET[bytes[i]! % TRACKING_ALPHABET.length];
    if (i === 3 || i === 7) out += '-';
  }
  return out; // e.g. K7H2-MQ9X-LP3R
}

export function hashTrackingCode(code: string, pepper: string): string {
  const normalized = code.replace(/-/g, '').toUpperCase();
  const salt = sha256(enc.encode('maranasi-tracking-salt:' + pepper)).slice(0, 16);
  const hash = argon2id(enc.encode(normalized), salt, ARGON_PARAMS);
  return toBase64(hash);
}

export function verifyTrackingCode(code: string, storedHash: string, pepper: string): boolean {
  const expected = fromBase64(storedHash);
  const normalized = code.replace(/-/g, '').toUpperCase();
  const salt = sha256(enc.encode('maranasi-tracking-salt:' + pepper)).slice(0, 16);
  const actual = argon2id(enc.encode(normalized), salt, ARGON_PARAMS);
  return constantTimeEqual(expected, actual);
}

// ============================================================
// IP hashing (pseudo-anonymous audit log)
// ============================================================
export async function hashIp(ip: string, dailySalt: string): Promise<string> {
  const mac = hmac(sha256, enc.encode(dailySalt), enc.encode(ip));
  // Argon2 here is overkill — IPs are low entropy but the salt rotates daily.
  // Use a fast HMAC; an attacker would need both the daily salt AND the audit row,
  // and the salt is purged after 90 days.
  return toBase64(mac).slice(0, 22);
}

export async function getOrCreateDailyIpSalt(kv: KVNamespace): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `audit:ip_salt:${day}`;
  const existing = await kv.get(key);
  if (existing) return existing;
  const fresh = toBase64(randomBytes(32));
  // 90 day expiry so old audit rows can still be correlated within window
  await kv.put(key, fresh, { expirationTtl: 60 * 60 * 24 * 90 });
  return fresh;
}

// ============================================================
// Document envelope encryption (AES-GCM via Web Crypto)
// Org master key is base64 — 32 bytes.
// ============================================================
export async function encryptForR2(plaintext: Uint8Array, masterKeyB64: string): Promise<{
  ciphertext: Uint8Array;
  iv: string;
  wrappedKey: string;
}> {
  // Generate per-doc key
  const docKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, docKey, plaintext);

  // Wrap doc key with master key
  const masterKey = await crypto.subtle.importKey('raw', fromBase64(masterKeyB64), { name: 'AES-KW' }, false, ['wrapKey']);
  const wrapped = await crypto.subtle.wrapKey('raw', docKey, masterKey, { name: 'AES-KW' });

  return {
    ciphertext: new Uint8Array(ct),
    iv: toBase64(iv),
    wrappedKey: toBase64(new Uint8Array(wrapped)),
  };
}

export async function decryptFromR2(ciphertext: Uint8Array, ivB64: string, wrappedKeyB64: string, masterKeyB64: string): Promise<Uint8Array> {
  const masterKey = await crypto.subtle.importKey('raw', fromBase64(masterKeyB64), { name: 'AES-KW' }, false, ['unwrapKey']);
  const docKey = await crypto.subtle.unwrapKey('raw', fromBase64(wrappedKeyB64), masterKey, { name: 'AES-KW' }, { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(ivB64) }, docKey, ciphertext);
  return new Uint8Array(pt);
}

// ============================================================
// Random helpers
// ============================================================
export function randomBytesB64(n: number): string {
  return toBase64(randomBytes(n));
}
