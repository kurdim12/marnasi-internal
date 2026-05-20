import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { z } from 'zod';
import { ulid } from 'ulid';
import { hashPassword, verifyPassword, signJwt, generateRefreshToken, hashRefreshToken } from '../lib/crypto';
import { getUserByEmail, getUserById } from '../lib/db';
import { audit } from '../lib/audit';
import { verifyTurnstile } from '../lib/turnstile';
import { requireAuth, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import type { AppContext } from '../types/env';

export const authRouter = new Hono<AppContext>();

// ============================================================
// Schemas
// ============================================================
const signupCompleteSchema = z.object({
  inviteToken: z.string().min(20),
  password: z.string().min(12).max(256),
  displayNameAr: z.string().min(1).max(80),
  displayNameEn: z.string().min(1).max(80),
  phone: z.string().max(32).optional(),
  // E2EE public key bundle (private parts NEVER sent)
  identityPubkey: z.string().min(32),
  signedPrekey: z.string().min(32),
  signedPrekeySig: z.string().min(32),
  oneTimePrekeys: z.array(z.string().min(32)).min(20).max(200),
  // Encrypted private-key bundle for cross-device login (opaque blob)
  encryptedKeyBundle: z.object({
    ciphertext: z.string().min(1),
    iv: z.string().min(1),
    kdfSalt: z.string().min(1),
    kdfIterations: z.number().int().min(100_000).max(2_000_000),
  }),
  turnstileToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totp: z.string().optional(),
  turnstileToken: z.string().optional(),
});

// ============================================================
// POST /auth/signup-complete
// ============================================================
authRouter.post(
  '/signup-complete',
  rateLimit({ bucket: 'signup', max: 5, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const parsed = signupCompleteSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'invalid_input', issues: parsed.error.flatten() }, 400);
    const body = parsed.data;

    if (!(await verifyTurnstile(body.turnstileToken, c.env.TURNSTILE_SECRET_KEY))) {
      return c.json({ error: 'turnstile_failed' }, 400);
    }

    // Verify invite
    const inviteTokenHash = hashRefreshToken(body.inviteToken, c.env.PASSWORD_PEPPER);
    const invite = await c.env.DB
      .prepare(`SELECT * FROM invites WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > ?`)
      .bind(inviteTokenHash, Date.now())
      .first<{ id: string; email: string; role: string; department: string | null }>();
    if (!invite) return c.json({ error: 'invite_invalid_or_expired' }, 400);

    // Ensure no existing user
    const existing = await getUserByEmail(c.env.DB, invite.email);
    if (existing) return c.json({ error: 'user_exists' }, 409);

    const now = Date.now();
    const userId = ulid();
    const pwHash = hashPassword(body.password, c.env.PASSWORD_PEPPER);

    const stmts = [
      c.env.DB.prepare(`
        INSERT INTO users (
          id, email, password_hash, display_name_ar, display_name_en, role, department, phone,
          identity_pubkey, signed_prekey, signed_prekey_sig, signed_prekey_rotated_at,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).bind(
        userId, invite.email, pwHash,
        body.displayNameAr, body.displayNameEn, invite.role, invite.department, body.phone ?? null,
        body.identityPubkey, body.signedPrekey, body.signedPrekeySig, now,
        now,
      ),
      c.env.DB.prepare(`UPDATE invites SET consumed_at = ? WHERE id = ?`).bind(now, invite.id),
      c.env.DB.prepare(`
        INSERT INTO user_key_bundles (user_id, ciphertext, iv, kdf_salt, kdf_iterations, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        body.encryptedKeyBundle.ciphertext,
        body.encryptedKeyBundle.iv,
        body.encryptedKeyBundle.kdfSalt,
        body.encryptedKeyBundle.kdfIterations,
        now,
      ),
    ];
    // One-time prekeys (batch)
    for (const pk of body.oneTimePrekeys) {
      stmts.push(
        c.env.DB.prepare(`INSERT INTO one_time_prekeys (id, user_id, pubkey, consumed, created_at) VALUES (?, ?, ?, 0, ?)`)
          .bind(ulid(), userId, pk, now),
      );
    }
    await c.env.DB.batch(stmts);

    await audit(c, { actorId: userId, action: 'signup.complete', targetType: 'user', targetId: userId });
    return c.json({ ok: true });
  },
);

// ============================================================
// POST /auth/login
// ============================================================
authRouter.post(
  '/login',
  rateLimit({ bucket: 'login', max: 10, windowMs: 15 * 60 * 1000 }),
  async (c) => {
    const parsed = loginSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
    const { email, password, turnstileToken } = parsed.data;

    if (!(await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY))) {
      return c.json({ error: 'turnstile_failed' }, 400);
    }

    const user = await getUserByEmail(c.env.DB, email);
    // Constant-time-ish: run argon2 even if user is missing to avoid timing leak
    const ok = user
      ? verifyPassword(password, user.password_hash, c.env.PASSWORD_PEPPER)
      : (verifyPassword(password, 'argon2id$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', c.env.PASSWORD_PEPPER), false);

    if (!user || !ok || user.status !== 'active') {
      await audit(c, { actorId: user?.id ?? null, action: 'login.failed', metadata: { email } });
      return c.json({ error: 'invalid_credentials' }, 401);
    }
    // TODO: enforce TOTP if user.totp_secret set

    const accessTtl = Number(c.env.ACCESS_TOKEN_TTL_SECONDS) || 900;
    const refreshTtl = Number(c.env.REFRESH_TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 30;
    const accessToken = await signJwt(
      { sub: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET,
      accessTtl,
    );
    const refreshToken = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshToken, c.env.PASSWORD_PEPPER);
    const sessionId = ulid();
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO sessions (id, user_id, refresh_token_hash, device_label, ip_hash, user_agent_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      sessionId, user.id, refreshHash, c.req.header('x-device-label') ?? null,
      c.get('ipHash'), c.get('userAgentHash'),
      now, now + refreshTtl * 1000,
    ).run();
    await c.env.DB.prepare(`UPDATE users SET last_seen_at = ? WHERE id = ?`).bind(now, user.id).run();

    setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true, secure: c.env.ENVIRONMENT !== 'development', sameSite: 'Strict', path: '/', maxAge: accessTtl,
    });
    setCookie(c, REFRESH_COOKIE_NAME, `${sessionId}.${refreshToken}`, {
      httpOnly: true, secure: c.env.ENVIRONMENT !== 'development', sameSite: 'Strict', path: '/auth', maxAge: refreshTtl,
    });

    await audit(c, { actorId: user.id, action: 'login.success' });
    return c.json({
      ok: true,
      user: {
        id: user.id, email: user.email, role: user.role,
        displayNameAr: user.display_name_ar, displayNameEn: user.display_name_en,
        department: user.department,
      },
    });
  },
);

// ============================================================
// POST /auth/refresh
// ============================================================
authRouter.post('/refresh', async (c) => {
  const raw = getCookie(c, REFRESH_COOKIE_NAME);
  if (!raw) return c.json({ error: 'no_session' }, 401);
  const [sessionId, refreshToken] = raw.split('.', 2);
  if (!sessionId || !refreshToken) return c.json({ error: 'invalid_session' }, 401);

  const session = await c.env.DB.prepare(`SELECT * FROM sessions WHERE id = ?`).bind(sessionId).first<{
    id: string; user_id: string; refresh_token_hash: string; expires_at: number; revoked_at: number | null;
  }>();
  if (!session || session.revoked_at || session.expires_at < Date.now()) {
    return c.json({ error: 'session_expired' }, 401);
  }
  if (hashRefreshToken(refreshToken, c.env.PASSWORD_PEPPER) !== session.refresh_token_hash) {
    // Token reuse — possible theft. Revoke all sessions for safety.
    await c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ?`)
      .bind(Date.now(), session.user_id).run();
    await audit(c, { actorId: session.user_id, action: 'refresh.token_reuse_detected' });
    return c.json({ error: 'token_reuse' }, 401);
  }

  const user = await getUserById(c.env.DB, session.user_id);
  if (!user || user.status !== 'active') return c.json({ error: 'user_inactive' }, 401);

  // Rotate
  const accessTtl = Number(c.env.ACCESS_TOKEN_TTL_SECONDS) || 900;
  const refreshTtl = Number(c.env.REFRESH_TOKEN_TTL_SECONDS) || 60 * 60 * 24 * 30;
  const newRefresh = generateRefreshToken();
  const now = Date.now();
  await c.env.DB.prepare(`
    UPDATE sessions SET refresh_token_hash = ?, expires_at = ? WHERE id = ?
  `).bind(hashRefreshToken(newRefresh, c.env.PASSWORD_PEPPER), now + refreshTtl * 1000, sessionId).run();

  const accessToken = await signJwt({ sub: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET, accessTtl);
  setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true, secure: c.env.ENVIRONMENT !== 'development', sameSite: 'Strict', path: '/', maxAge: accessTtl,
  });
  setCookie(c, REFRESH_COOKIE_NAME, `${sessionId}.${newRefresh}`, {
    httpOnly: true, secure: c.env.ENVIRONMENT !== 'development', sameSite: 'Strict', path: '/auth', maxAge: refreshTtl,
  });
  return c.json({ ok: true });
});

// ============================================================
// POST /auth/logout
// ============================================================
authRouter.post('/logout', async (c) => {
  const raw = getCookie(c, REFRESH_COOKIE_NAME);
  if (raw) {
    const [sessionId] = raw.split('.', 2);
    if (sessionId) {
      await c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE id = ?`).bind(Date.now(), sessionId).run();
    }
  }
  deleteCookie(c, ACCESS_COOKIE_NAME, { path: '/' });
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/auth' });
  return c.json({ ok: true });
});

// ============================================================
// GET /auth/me
// ============================================================
authRouter.get('/me', requireAuth, async (c) => {
  const u = c.get('user')!;
  const user = await getUserById(c.env.DB, u.id);
  if (!user) return c.json({ error: 'not_found' }, 404);
  return c.json({
    id: user.id,
    email: user.email,
    role: user.role,
    department: user.department,
    displayNameAr: user.display_name_ar,
    displayNameEn: user.display_name_en,
    phone: user.phone,
    identityPubkey: user.identity_pubkey,
  });
});

// ============================================================
// GET /auth/key-bundle  — fetch encrypted private-key bundle
// ============================================================
authRouter.get('/key-bundle', requireAuth, async (c) => {
  const u = c.get('user')!;
  const row = await c.env.DB.prepare(`SELECT ciphertext, iv, kdf_salt, kdf_iterations FROM user_key_bundles WHERE user_id = ?`)
    .bind(u.id).first<{ ciphertext: string; iv: string; kdf_salt: string; kdf_iterations: number }>();
  if (!row) return c.json({ error: 'not_found' }, 404);
  return c.json({
    ciphertext: row.ciphertext,
    iv: row.iv,
    kdfSalt: row.kdf_salt,
    kdfIterations: row.kdf_iterations,
  });
});
