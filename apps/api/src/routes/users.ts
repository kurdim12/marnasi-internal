import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { requireAuth } from '../middleware/auth';
import { audit } from '../lib/audit';
import type { AppContext } from '../types/env';

export const usersRouter = new Hono<AppContext>();

usersRouter.use('*', requireAuth);

// GET /users/directory — paginated list (no key material exposed)
usersRouter.get('/directory', async (c) => {
  const dept = c.req.query('department');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100);
  const cursor = c.req.query('cursor') ?? '';
  const rows = dept
    ? await c.env.DB.prepare(`
        SELECT id, email, role, department, display_name_ar, display_name_en, identity_pubkey, last_seen_at
        FROM users WHERE status = 'active' AND department = ? AND id > ? ORDER BY id LIMIT ?
      `).bind(dept, cursor, limit).all()
    : await c.env.DB.prepare(`
        SELECT id, email, role, department, display_name_ar, display_name_en, identity_pubkey, last_seen_at
        FROM users WHERE status = 'active' AND id > ? ORDER BY id LIMIT ?
      `).bind(cursor, limit).all();
  return c.json({ users: rows.results, nextCursor: (rows.results.at(-1) as { id?: string } | undefined)?.id ?? null });
});

// GET /users/:id/prekey — consume one one-time prekey for X3DH
usersRouter.get('/:id/prekey', async (c) => {
  const userId = c.req.param('id');
  // Atomic consume
  const pk = await c.env.DB.prepare(`
    SELECT id, pubkey FROM one_time_prekeys WHERE user_id = ? AND consumed = 0 LIMIT 1
  `).bind(userId).first<{ id: string; pubkey: string }>();

  const user = await c.env.DB.prepare(`
    SELECT identity_pubkey, signed_prekey, signed_prekey_sig FROM users WHERE id = ? AND status = 'active'
  `).bind(userId).first<{ identity_pubkey: string; signed_prekey: string; signed_prekey_sig: string }>();
  if (!user) return c.json({ error: 'not_found' }, 404);

  if (pk) {
    await c.env.DB.prepare(`UPDATE one_time_prekeys SET consumed = 1 WHERE id = ?`).bind(pk.id).run();
  }
  return c.json({
    identityPubkey: user.identity_pubkey,
    signedPrekey: user.signed_prekey,
    signedPrekeySig: user.signed_prekey_sig,
    oneTimePrekey: pk?.pubkey ?? null,
  });
});

// POST /users/me/prekeys/replenish
const replenishSchema = z.object({ prekeys: z.array(z.string().min(32)).min(1).max(200) });
usersRouter.post('/me/prekeys/replenish', async (c) => {
  const parsed = replenishSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const u = c.get('user')!;
  const now = Date.now();
  const stmts = parsed.data.prekeys.map((pk) =>
    c.env.DB.prepare(`INSERT INTO one_time_prekeys (id, user_id, pubkey, consumed, created_at) VALUES (?, ?, ?, 0, ?)`)
      .bind(ulid(), u.id, pk, now),
  );
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, count: parsed.data.prekeys.length });
});

// PATCH /users/me
const updateSelfSchema = z.object({
  displayNameAr: z.string().min(1).max(80).optional(),
  displayNameEn: z.string().min(1).max(80).optional(),
  phone: z.string().max(32).optional(),
});
usersRouter.patch('/me', async (c) => {
  const parsed = updateSelfSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const u = c.get('user')!;
  const updates: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.displayNameAr !== undefined) { updates.push('display_name_ar = ?'); values.push(parsed.data.displayNameAr); }
  if (parsed.data.displayNameEn !== undefined) { updates.push('display_name_en = ?'); values.push(parsed.data.displayNameEn); }
  if (parsed.data.phone !== undefined) { updates.push('phone = ?'); values.push(parsed.data.phone); }
  if (updates.length === 0) return c.json({ ok: true });
  values.push(u.id);
  await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  await audit(c, { actorId: u.id, action: 'user.update_self' });
  return c.json({ ok: true });
});
