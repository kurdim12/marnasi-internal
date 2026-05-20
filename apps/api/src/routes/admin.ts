import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { requireAuth, requireRole } from '../middleware/auth';
import { hashRefreshToken, generateRefreshToken } from '../lib/crypto';
import { audit } from '../lib/audit';
import { getUserByEmail } from '../lib/db';
import type { AppContext } from '../types/env';

export const adminRouter = new Hono<AppContext>();
adminRouter.use('*', requireAuth, requireRole('admin', 'owner'));

// ============================================================
// POST /admin/users  — create invite
// ============================================================
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['staff', 'manager', 'hr', 'admin', 'owner']).default('staff'),
  department: z.string().max(80).optional(),
});

adminRouter.post('/users', async (c) => {
  const parsed = inviteSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const existing = await getUserByEmail(c.env.DB, parsed.data.email);
  if (existing) return c.json({ error: 'user_exists' }, 409);

  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token, c.env.PASSWORD_PEPPER);
  const id = ulid();
  const u = c.get('user')!;
  const now = Date.now();
  const ttl = 24 * 60 * 60 * 1000;

  await c.env.DB.prepare(`
    INSERT INTO invites (id, email, role, department, token_hash, invited_by, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, parsed.data.email, parsed.data.role, parsed.data.department ?? null, tokenHash, u.id, now, now + ttl).run();

  // Queue email — actual send happens in queue consumer
  await c.env.JOBS_QUEUE.send({
    kind: 'send_invite_email',
    email: parsed.data.email,
    token,
    inviterName: u.email,
  });

  await audit(c, { actorId: u.id, action: 'admin.invite_created', targetType: 'invite', targetId: id, metadata: { email: parsed.data.email, role: parsed.data.role } });
  // Return token only in dev so admin can copy/paste; in prod the email link is the only delivery
  return c.json({ id, expiresAt: now + ttl, ...(c.env.ENVIRONMENT === 'development' ? { devToken: token } : {}) });
});

// PATCH /admin/users/:id/role
const roleSchema = z.object({ role: z.enum(['staff', 'manager', 'hr', 'admin', 'owner']) });
adminRouter.patch('/users/:id/role', async (c) => {
  const parsed = roleSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const targetId = c.req.param('id');
  await c.env.DB.prepare(`UPDATE users SET role = ? WHERE id = ?`).bind(parsed.data.role, targetId).run();
  await audit(c, { actorId: c.get('user')!.id, action: 'admin.role_change', targetType: 'user', targetId, metadata: { role: parsed.data.role } });
  return c.json({ ok: true });
});

// DELETE /admin/users/:id  — soft delete + revoke sessions
adminRouter.delete('/users/:id', async (c) => {
  const targetId = c.req.param('id');
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE users SET status = 'deleted', email = email || '#deleted-' || ? WHERE id = ?`).bind(String(now), targetId),
    c.env.DB.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`).bind(now, targetId),
  ]);
  await audit(c, { actorId: c.get('user')!.id, action: 'admin.user_deleted', targetType: 'user', targetId });
  return c.json({ ok: true });
});

// GET /admin/audit
adminRouter.get('/audit', async (c) => {
  const actor = c.req.query('actor');
  const action = c.req.query('action');
  const from = Number(c.req.query('from') ?? 0);
  const to = Number(c.req.query('to') ?? Date.now());
  const limit = Math.min(Number(c.req.query('limit') ?? 200), 500);

  const where: string[] = ['created_at BETWEEN ? AND ?'];
  const binds: unknown[] = [from, to];
  if (actor) { where.push('actor_id = ?'); binds.push(actor); }
  if (action) { where.push('action = ?'); binds.push(action); }
  binds.push(limit);

  const rows = await c.env.DB.prepare(`
    SELECT * FROM audit_log WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ?
  `).bind(...binds).all();
  return c.json({ entries: rows.results });
});

// POST /admin/hr-key  — rotate HR public key
const hrKeySchema = z.object({ publicKey: z.string().min(32) });
adminRouter.post('/hr-key', async (c) => {
  const parsed = hrKeySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const now = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE hr_keys SET active = 0, retired_at = ? WHERE active = 1`).bind(now),
    c.env.DB.prepare(`INSERT INTO hr_keys (public_key, active, created_at) VALUES (?, 1, ?)`).bind(parsed.data.publicKey, now),
  ]);
  await audit(c, { actorId: c.get('user')!.id, action: 'admin.hr_key_rotated' });
  return c.json({ ok: true });
});
