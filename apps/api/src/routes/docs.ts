import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { requireAuth } from '../middleware/auth';
import { encryptForR2, decryptFromR2 } from '../lib/crypto';
import { audit } from '../lib/audit';
import type { AppContext } from '../types/env';

export const docsRouter = new Hono<AppContext>();
docsRouter.use('*', requireAuth);

// GET /docs
docsRouter.get('/', async (c) => {
  const u = c.get('user')!;
  const visibilityClause = `(
    visibility = 'company'
    OR (visibility = 'department' AND department = ?)
    OR (visibility = 'private' AND uploaded_by = ?)
  )`;
  const rows = await c.env.DB.prepare(`
    SELECT id, title, description, uploaded_by, visibility, department, size_bytes, mime_type, created_at
    FROM documents WHERE deleted_at IS NULL AND ${visibilityClause}
    ORDER BY created_at DESC LIMIT 200
  `).bind(u.department ?? '', u.id).all();
  return c.json({ documents: rows.results });
});

// POST /docs  — multipart upload
docsRouter.post('/', async (c) => {
  const u = c.get('user')!;
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'file_required' }, 400);
  const title = String(form.get('title') ?? file.name).slice(0, 200);
  const description = form.get('description') ? String(form.get('description')).slice(0, 2000) : null;
  const visibilityRaw = String(form.get('visibility') ?? 'private');
  const parsedVisibility = z.enum(['private', 'department', 'company']).safeParse(visibilityRaw);
  if (!parsedVisibility.success) return c.json({ error: 'invalid_visibility' }, 400);
  const visibility = parsedVisibility.data;
  const department = form.get('department') ? String(form.get('department')) : (visibility === 'department' ? u.department : null);

  if (file.size > 50 * 1024 * 1024) return c.json({ error: 'file_too_large' }, 413);

  const plaintext = new Uint8Array(await file.arrayBuffer());
  const { ciphertext, iv, wrappedKey } = await encryptForR2(plaintext, c.env.ORG_MASTER_KEY);
  const r2Key = `docs/${ulid()}`;
  await c.env.DOCS_BUCKET.put(r2Key, ciphertext);

  const id = ulid();
  await c.env.DB.prepare(`
    INSERT INTO documents (
      id, title, description, r2_key, envelope_key_wrapped, envelope_iv,
      uploaded_by, visibility, department, size_bytes, mime_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, title, description, r2Key, wrappedKey, iv,
    u.id, visibility, department, file.size, file.type || 'application/octet-stream', Date.now(),
  ).run();

  await audit(c, { actorId: u.id, action: 'doc.upload', targetType: 'document', targetId: id, metadata: { title, size: file.size, visibility } });
  return c.json({ id, title, sizeBytes: file.size });
});

// GET /docs/:id/download
docsRouter.get('/:id/download', async (c) => {
  const u = c.get('user')!;
  const id = c.req.param('id');
  const doc = await c.env.DB.prepare(`
    SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL
  `).bind(id).first<{
    id: string; title: string; r2_key: string; envelope_key_wrapped: string; envelope_iv: string;
    uploaded_by: string; visibility: string; department: string | null; mime_type: string | null;
  }>();
  if (!doc) return c.json({ error: 'not_found' }, 404);

  const allowed =
    doc.visibility === 'company' ||
    (doc.visibility === 'department' && doc.department === u.department) ||
    (doc.visibility === 'private' && doc.uploaded_by === u.id) ||
    ['admin', 'owner'].includes(u.role);
  if (!allowed) return c.json({ error: 'forbidden' }, 403);

  const obj = await c.env.DOCS_BUCKET.get(doc.r2_key);
  if (!obj) return c.json({ error: 'object_missing' }, 404);
  const ct = new Uint8Array(await obj.arrayBuffer());
  const pt = await decryptFromR2(ct, doc.envelope_iv, doc.envelope_key_wrapped, c.env.ORG_MASTER_KEY);

  await audit(c, { actorId: u.id, action: 'doc.download', targetType: 'document', targetId: id });
  return new Response(pt, {
    headers: {
      'content-type': doc.mime_type || 'application/octet-stream',
      'content-disposition': `attachment; filename="${encodeURIComponent(doc.title)}"`,
    },
  });
});

// DELETE /docs/:id  — soft delete
docsRouter.delete('/:id', async (c) => {
  const u = c.get('user')!;
  const id = c.req.param('id');
  const doc = await c.env.DB.prepare(`SELECT uploaded_by FROM documents WHERE id = ?`).bind(id).first<{ uploaded_by: string }>();
  if (!doc) return c.json({ error: 'not_found' }, 404);
  if (doc.uploaded_by !== u.id && !['admin', 'owner'].includes(u.role)) return c.json({ error: 'forbidden' }, 403);
  await c.env.DB.prepare(`UPDATE documents SET deleted_at = ? WHERE id = ?`).bind(Date.now(), id).run();
  await audit(c, { actorId: u.id, action: 'doc.delete', targetType: 'document', targetId: id });
  return c.json({ ok: true });
});
