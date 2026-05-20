import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { requireAuth, requireRole } from '../middleware/auth';
import { audit } from '../lib/audit';
import type { AppContext } from '../types/env';

export const hrRouter = new Hono<AppContext>();
hrRouter.use('*', requireAuth);

// ============================================================
// LEAVE REQUESTS
// ============================================================
const submitLeaveSchema = z.object({
  type: z.enum(['annual', 'sick', 'unpaid', 'maternity']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(2000).optional(),
});
hrRouter.post('/leave', async (c) => {
  const parsed = submitLeaveSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  if (parsed.data.endDate < parsed.data.startDate) return c.json({ error: 'invalid_dates' }, 400);

  const u = c.get('user')!;
  const id = ulid();
  await c.env.DB.prepare(`
    INSERT INTO leave_requests (id, user_id, type, start_date, end_date, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).bind(id, u.id, parsed.data.type, parsed.data.startDate, parsed.data.endDate, parsed.data.reason ?? null, Date.now()).run();

  await audit(c, { actorId: u.id, action: 'hr.leave_submitted', targetType: 'leave_request', targetId: id });
  return c.json({ id });
});

hrRouter.get('/leave', async (c) => {
  const u = c.get('user')!;
  const scope = c.req.query('scope') ?? 'me';
  if (scope === 'me') {
    const rows = await c.env.DB.prepare(`SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).bind(u.id).all();
    return c.json({ requests: rows.results });
  }
  if (scope === 'team') {
    if (!['manager', 'hr', 'admin', 'owner'].includes(u.role)) return c.json({ error: 'forbidden' }, 403);
    const rows = u.role === 'manager' && u.department
      ? await c.env.DB.prepare(`
          SELECT lr.* FROM leave_requests lr JOIN users u ON u.id = lr.user_id
          WHERE u.department = ? ORDER BY lr.created_at DESC LIMIT 200
        `).bind(u.department).all()
      : await c.env.DB.prepare(`SELECT * FROM leave_requests ORDER BY created_at DESC LIMIT 200`).all();
    return c.json({ requests: rows.results });
  }
  return c.json({ error: 'invalid_scope' }, 400);
});

const decideLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']),
  approverNote: z.string().max(2000).optional(),
});
hrRouter.patch('/leave/:id', async (c) => {
  const parsed = decideLeaveSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const u = c.get('user')!;
  const id = c.req.param('id');
  const lr = await c.env.DB.prepare(`SELECT * FROM leave_requests WHERE id = ?`).bind(id).first<{ user_id: string; status: string }>();
  if (!lr) return c.json({ error: 'not_found' }, 404);

  const isOwner = lr.user_id === u.id;
  const isManager = ['manager', 'hr', 'admin', 'owner'].includes(u.role);
  if (parsed.data.status === 'cancelled' ? !isOwner : !isManager) {
    return c.json({ error: 'forbidden' }, 403);
  }

  await c.env.DB.prepare(`
    UPDATE leave_requests SET status = ?, approver_id = ?, approver_note = ?, decided_at = ? WHERE id = ?
  `).bind(parsed.data.status, isManager ? u.id : null, parsed.data.approverNote ?? null, Date.now(), id).run();

  await audit(c, { actorId: u.id, action: `hr.leave_${parsed.data.status}`, targetType: 'leave_request', targetId: id });
  return c.json({ ok: true });
});

// ============================================================
// PAYSLIPS  (E2EE per-employee; HR uploads with employee's pubkey)
// ============================================================
const uploadPayslipSchema = z.object({
  userId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  r2Key: z.string().min(1),                 // HR uploads to ATTACHMENTS_BUCKET out of band, then registers
  wrappedKey: z.string().min(1),            // payslip AES key wrapped with employee's identity pubkey
  iv: z.string().min(1),
});
hrRouter.post('/payslips', requireRole('hr', 'admin', 'owner'), async (c) => {
  const parsed = uploadPayslipSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const id = ulid();
  await c.env.DB.prepare(`
    INSERT INTO payslips (id, user_id, period, r2_key, wrapped_key, iv, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, parsed.data.userId, parsed.data.period, parsed.data.r2Key, parsed.data.wrappedKey, parsed.data.iv, Date.now()).run();
  await audit(c, { actorId: c.get('user')!.id, action: 'hr.payslip_uploaded', targetType: 'payslip', targetId: id, metadata: { userId: parsed.data.userId, period: parsed.data.period } });
  return c.json({ id });
});

hrRouter.get('/payslips/me', async (c) => {
  const u = c.get('user')!;
  const rows = await c.env.DB.prepare(`
    SELECT id, period, r2_key, wrapped_key, iv, created_at FROM payslips WHERE user_id = ? ORDER BY period DESC
  `).bind(u.id).all();
  return c.json({ payslips: rows.results });
});

hrRouter.get('/payslips/:id/download', async (c) => {
  const u = c.get('user')!;
  const id = c.req.param('id');
  const ps = await c.env.DB.prepare(`SELECT * FROM payslips WHERE id = ?`).bind(id).first<{ user_id: string; r2_key: string }>();
  if (!ps) return c.json({ error: 'not_found' }, 404);
  if (ps.user_id !== u.id && !['hr', 'admin', 'owner'].includes(u.role)) return c.json({ error: 'forbidden' }, 403);
  const obj = await c.env.ATTACHMENTS_BUCKET.get(ps.r2_key);
  if (!obj) return c.json({ error: 'object_missing' }, 404);
  await audit(c, { actorId: u.id, action: 'hr.payslip_downloaded', targetType: 'payslip', targetId: id });
  // Returns ciphertext; client decrypts with their identity private key.
  return new Response(obj.body, {
    headers: { 'content-type': 'application/octet-stream' },
  });
});
