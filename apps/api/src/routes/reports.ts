import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { hashTrackingCode } from '../lib/crypto';
import { getActiveHrKey, getHrKeyById } from '../lib/db';
import { audit } from '../lib/audit';
import { verifyTurnstile } from '../lib/turnstile';
import { rateLimit } from '../middleware/rateLimit';
import { requireAuth, requireRole } from '../middleware/auth';
import type { AppContext } from '../types/env';

export const reportsRouter = new Hono<AppContext>();
export const adminReportsRouter = new Hono<AppContext>();

// ============================================================
// GET /reports/hr-key  — fetch active HR public key for new submissions
// PUBLIC (no auth).
// ============================================================
reportsRouter.get('/hr-key', async (c) => {
  const hr = await getActiveHrKey(c.env.DB);
  if (!hr) return c.json({ error: 'no_active_hr_key' }, 503);
  return c.json({ id: hr.id, publicKey: hr.public_key });
});

// ============================================================
// POST /reports  — submit anonymous report
// PUBLIC (no auth). Heavily rate-limited.
// ZERO user identity is captured. No IP. No session. No actor_id.
// ============================================================
const submitReportSchema = z.object({
  category: z.enum(['harassment', 'safety', 'financial', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  hrKeyId: z.number().int().positive(),
  ephemeralPubkey: z.string().min(32),
  wrappedAesKey: z.string().min(1),
  titleEncrypted: z.string().min(1),
  bodyEncrypted: z.string().min(1),
  attachmentsEncrypted: z.string().optional(),
  // Raw tracking code sent over TLS; server argon2-hashes and never persists plaintext.
  trackingCode: z.string().min(8).max(32),
  turnstileToken: z.string().min(1),
});

reportsRouter.post(
  '/',
  rateLimit({ bucket: 'reports_submit', max: 5, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const parsed = submitReportSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'invalid_input', issues: parsed.error.flatten() }, 400);
    const body = parsed.data;

    if (!(await verifyTurnstile(body.turnstileToken, c.env.TURNSTILE_SECRET_KEY))) {
      return c.json({ error: 'turnstile_failed' }, 400);
    }

    const hr = await getHrKeyById(c.env.DB, body.hrKeyId);
    if (!hr) return c.json({ error: 'hr_key_not_found' }, 400);

    const now = Date.now();
    const ttlDays = Number(c.env.REPORT_TTL_DAYS) || 180;
    const id = ulid();

    const trackingCodeHash = hashTrackingCode(body.trackingCode, c.env.PASSWORD_PEPPER);

    await c.env.DB.prepare(`
      INSERT INTO reports (
        id, category, severity, hr_key_id,
        ephemeral_pubkey, wrapped_aes_key, title_encrypted, body_encrypted, attachments_encrypted,
        tracking_code_hash, status, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `).bind(
      id, body.category, body.severity, body.hrKeyId,
      body.ephemeralPubkey, body.wrappedAesKey, body.titleEncrypted, body.bodyEncrypted, body.attachmentsEncrypted ?? null,
      trackingCodeHash,
      now, now, now + ttlDays * 24 * 60 * 60 * 1000,
    ).run();

    // Audit with actorId = null. No tie back to submitter.
    await audit(c, { actorId: null, action: 'report.submitted', targetType: 'report', targetId: id, metadata: { category: body.category, severity: body.severity } });

    return c.json({ ok: true, reportId: id });
  },
);

// ============================================================
// POST /reports/track  — status check by tracking code
// PUBLIC. Rate-limited harder.
// ============================================================
const trackSchema = z.object({
  code: z.string().min(8).max(32),
  turnstileToken: z.string().min(1),
});
reportsRouter.post(
  '/track',
  rateLimit({ bucket: 'reports_track', max: 20, windowMs: 60 * 60 * 1000 }),
  async (c) => {
    const parsed = trackSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
    if (!(await verifyTurnstile(parsed.data.turnstileToken, c.env.TURNSTILE_SECRET_KEY))) {
      return c.json({ error: 'turnstile_failed' }, 400);
    }

    // Compute the deterministic argon2 hash (uses pepper-derived salt) and
    // index-lookup. Single argon2 call; constant-time-ish at server side.
    const targetHash = hashTrackingCode(parsed.data.code, c.env.PASSWORD_PEPPER);
    const match = await c.env.DB.prepare(`
      SELECT id, status, status_note_encrypted, updated_at, created_at, category, severity
      FROM reports WHERE tracking_code_hash = ? AND expires_at > ? LIMIT 1
    `).bind(targetHash, Date.now()).first<{
      id: string; status: string; status_note_encrypted: string | null;
      updated_at: number; created_at: number; category: string; severity: string;
    }>();

    if (!match) return c.json({ error: 'not_found' }, 404);

    return c.json({
      id: match.id,
      status: match.status,
      category: match.category,
      severity: match.severity,
      statusNoteEncrypted: match.status_note_encrypted,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
    });
  },
);

// ============================================================
// ADMIN / HR routes
// ============================================================
adminReportsRouter.use('*', requireAuth, requireRole('hr', 'admin', 'owner'));

// GET /admin/reports
adminReportsRouter.get('/', async (c) => {
  const status = c.req.query('status');
  const rows = status
    ? await c.env.DB.prepare(`
        SELECT id, category, severity, hr_key_id, ephemeral_pubkey, wrapped_aes_key,
               title_encrypted, body_encrypted, attachments_encrypted,
               status, status_note_encrypted, created_at, updated_at, expires_at
        FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT 200
      `).bind(status).all()
    : await c.env.DB.prepare(`
        SELECT id, category, severity, hr_key_id, ephemeral_pubkey, wrapped_aes_key,
               title_encrypted, body_encrypted, attachments_encrypted,
               status, status_note_encrypted, created_at, updated_at, expires_at
        FROM reports ORDER BY created_at DESC LIMIT 200
      `).all();

  // Audit list access (HR viewed the inbox)
  await audit(c, { actorId: c.get('user')!.id, action: 'report.inbox_viewed' });
  return c.json({ reports: rows.results });
});

// PATCH /admin/reports/:id/status
const updateStatusSchema = z.object({
  status: z.enum(['open', 'triaged', 'investigating', 'resolved', 'closed']),
  statusNoteEncrypted: z.string().optional(),
});
adminReportsRouter.patch('/:id/status', async (c) => {
  const parsed = updateStatusSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const id = c.req.param('id');
  const now = Date.now();
  await c.env.DB.prepare(`
    UPDATE reports SET status = ?, status_note_encrypted = ?, updated_at = ? WHERE id = ?
  `).bind(parsed.data.status, parsed.data.statusNoteEncrypted ?? null, now, id).run();

  await audit(c, {
    actorId: c.get('user')!.id,
    action: 'report.status_change',
    targetType: 'report', targetId: id,
    metadata: { status: parsed.data.status },
  });
  return c.json({ ok: true });
});

