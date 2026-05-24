import { cookies } from 'next/headers';
import { staff } from './seed';
import type { Profile } from './types';

/*
  DEMO-GRADE auth. This is intentionally lightweight: it gates the pitch demo
  by checking a shared demo password against the seeded staff directory and
  issues an HMAC-signed, httpOnly session cookie. It is NOT production auth —
  production would wire to the intranet's D1/Workers auth (or Supabase per the
  brief). The signing prevents trivial cookie forgery; identity selection is by
  the staff email entered at login.
*/

export const SESSION_COOKIE = 'hub_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

const SECRET = process.env.HUB_SESSION_SECRET ?? 'maranasi-hub-dev-secret-change-me';
const DEMO_PASSWORD = process.env.HUB_DEMO_PASSWORD ?? 'maranasi';

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return b64url(new Uint8Array(sig));
}

/** Constant-time-ish comparison for the signature halves. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signToken(userId: string): Promise<string> {
  return `${userId}.${await hmac(userId)}`;
}

async function verifyToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(userId);
  return safeEqual(sig, expected) ? userId : null;
}

export interface SignInResult {
  ok: boolean;
  error?: 'invalid';
}

/** Validate credentials against the seeded staff + shared demo password. */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const member = staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
  if (!member || password !== DEMO_PASSWORD) {
    return { ok: false, error: 'invalid' };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signToken(member.userId), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Resolve the currently signed-in staff member, or null. */
export async function getSessionUser(): Promise<Profile | null> {
  const jar = await cookies();
  const userId = await verifyToken(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return staff.find((s) => s.userId === userId) ?? null;
}
