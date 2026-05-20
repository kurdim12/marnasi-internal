import { Hono } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { requireAuth } from '../middleware/auth';
import { audit } from '../lib/audit';
import { fromBase64 } from '../lib/crypto';
import type { AppContext } from '../types/env';

export const chatRouter = new Hono<AppContext>();
chatRouter.use('*', requireAuth);

// ============================================================
// POST /rooms  — create DM or group
// ============================================================
const createRoomSchema = z.object({
  type: z.enum(['dm', 'group', 'channel']),
  nameEncrypted: z.string().optional(),
  members: z.array(z.object({
    userId: z.string().min(1),
    wrappedRoomKey: z.string().min(1),
    role: z.enum(['owner', 'admin', 'member']).default('member'),
  })).min(1).max(200),
});

chatRouter.post('/', async (c) => {
  const parsed = createRoomSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input', issues: parsed.error.flatten() }, 400);
  const { type, nameEncrypted, members } = parsed.data;
  const u = c.get('user')!;

  // Sanity: DMs are exactly 2 members
  if (type === 'dm' && members.length !== 2) return c.json({ error: 'dm_requires_two_members' }, 400);

  // Caller must be in the member list
  if (!members.some((m) => m.userId === u.id)) return c.json({ error: 'creator_must_be_member' }, 400);

  const roomId = ulid();
  const now = Date.now();

  const stmts = [
    c.env.DB.prepare(`
      INSERT INTO rooms (id, type, name_encrypted, current_key_version, created_by, created_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).bind(roomId, type, nameEncrypted ?? null, u.id, now),
  ];
  for (const m of members) {
    stmts.push(
      c.env.DB.prepare(`
        INSERT INTO room_members (room_id, user_id, wrapped_room_key, key_version, role, joined_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).bind(roomId, m.userId, m.wrappedRoomKey, m.userId === u.id ? 'owner' : m.role, now),
    );
  }
  await c.env.DB.batch(stmts);

  await audit(c, { actorId: u.id, action: 'room.create', targetType: 'room', targetId: roomId, metadata: { type, memberCount: members.length } });
  return c.json({ id: roomId, type, createdAt: now });
});

// ============================================================
// GET /rooms — my rooms
// ============================================================
chatRouter.get('/', async (c) => {
  const u = c.get('user')!;
  const rows = await c.env.DB.prepare(`
    SELECT r.id, r.type, r.name_encrypted, r.current_key_version, r.created_at,
           rm.wrapped_room_key, rm.key_version, rm.role, rm.last_read_message_id,
           (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id AND m.deleted_at IS NULL) AS message_count,
           (SELECT MAX(created_at) FROM messages m WHERE m.room_id = r.id) AS last_message_at
    FROM rooms r
    JOIN room_members rm ON rm.room_id = r.id
    WHERE rm.user_id = ?
    ORDER BY last_message_at DESC NULLS LAST, r.created_at DESC
  `).bind(u.id).all();
  return c.json({ rooms: rows.results });
});

// ============================================================
// GET /rooms/:id
// ============================================================
chatRouter.get('/:id', async (c) => {
  const u = c.get('user')!;
  const roomId = c.req.param('id');
  const room = await c.env.DB.prepare(`
    SELECT r.*, rm.wrapped_room_key, rm.key_version AS member_key_version, rm.role
    FROM rooms r JOIN room_members rm ON rm.room_id = r.id
    WHERE r.id = ? AND rm.user_id = ?
  `).bind(roomId, u.id).first();
  if (!room) return c.json({ error: 'not_found' }, 404);
  const members = await c.env.DB.prepare(`
    SELECT rm.user_id, rm.role, rm.key_version, u.display_name_ar, u.display_name_en, u.identity_pubkey
    FROM room_members rm JOIN users u ON u.id = rm.user_id
    WHERE rm.room_id = ?
  `).bind(roomId).all();
  return c.json({ room, members: members.results });
});

// ============================================================
// POST /rooms/:id/members  — add member (rewraps room key for them)
// ============================================================
const addMemberSchema = z.object({
  userId: z.string().min(1),
  wrappedRoomKey: z.string().min(1),
  role: z.enum(['admin', 'member']).default('member'),
});
chatRouter.post('/:id/members', async (c) => {
  const parsed = addMemberSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const roomId = c.req.param('id');
  const u = c.get('user')!;
  const callerMembership = await c.env.DB.prepare(`SELECT role FROM room_members WHERE room_id = ? AND user_id = ?`)
    .bind(roomId, u.id).first<{ role: string }>();
  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) return c.json({ error: 'forbidden' }, 403);
  const room = await c.env.DB.prepare(`SELECT current_key_version FROM rooms WHERE id = ?`).bind(roomId).first<{ current_key_version: number }>();
  if (!room) return c.json({ error: 'not_found' }, 404);

  await c.env.DB.prepare(`
    INSERT INTO room_members (room_id, user_id, wrapped_room_key, key_version, role, joined_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(roomId, parsed.data.userId, parsed.data.wrappedRoomKey, room.current_key_version, parsed.data.role, Date.now()).run();
  await audit(c, { actorId: u.id, action: 'room.add_member', targetType: 'room', targetId: roomId, metadata: { added: parsed.data.userId } });
  return c.json({ ok: true });
});

// ============================================================
// DELETE /rooms/:id/members/:userId  — triggers key rotation
// ============================================================
const rotateKeySchema = z.object({
  newKeyVersion: z.number().int().positive(),
  newWrappedKeys: z.array(z.object({
    userId: z.string(),
    wrappedRoomKey: z.string(),
  })).min(1),
});
chatRouter.delete('/:id/members/:userId', async (c) => {
  const roomId = c.req.param('id');
  const removeUserId = c.req.param('userId');
  const u = c.get('user')!;
  const callerMembership = await c.env.DB.prepare(`SELECT role FROM room_members WHERE room_id = ? AND user_id = ?`)
    .bind(roomId, u.id).first<{ role: string }>();
  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) return c.json({ error: 'forbidden' }, 403);

  // Body must contain the rotated key wraps for all remaining members
  const parsed = rotateKeySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'must_provide_rotated_keys', issues: parsed.error.flatten() }, 400);

  const stmts = [
    c.env.DB.prepare(`DELETE FROM room_members WHERE room_id = ? AND user_id = ?`).bind(roomId, removeUserId),
    c.env.DB.prepare(`UPDATE rooms SET current_key_version = ? WHERE id = ?`).bind(parsed.data.newKeyVersion, roomId),
  ];
  for (const k of parsed.data.newWrappedKeys) {
    stmts.push(
      c.env.DB.prepare(`UPDATE room_members SET wrapped_room_key = ?, key_version = ? WHERE room_id = ? AND user_id = ?`)
        .bind(k.wrappedRoomKey, parsed.data.newKeyVersion, roomId, k.userId),
    );
  }
  await c.env.DB.batch(stmts);
  await audit(c, { actorId: u.id, action: 'room.remove_member', targetType: 'room', targetId: roomId, metadata: { removed: removeUserId, keyVersion: parsed.data.newKeyVersion } });
  return c.json({ ok: true });
});

// ============================================================
// GET /rooms/:id/messages?before=&limit=
// ============================================================
chatRouter.get('/:id/messages', async (c) => {
  const u = c.get('user')!;
  const roomId = c.req.param('id');
  const before = Number(c.req.query('before') ?? Date.now());
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);

  const member = await c.env.DB.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`)
    .bind(roomId, u.id).first();
  if (!member) return c.json({ error: 'forbidden' }, 403);

  const rows = await c.env.DB.prepare(`
    SELECT id, sender_id, ciphertext, iv, key_version, content_type, attachment_r2_key, attachment_meta_encrypted, created_at, edited_at, deleted_at
    FROM messages
    WHERE room_id = ? AND created_at < ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(roomId, before, limit).all<{
    id: string; sender_id: string; ciphertext: ArrayBuffer; iv: ArrayBuffer;
    key_version: number; content_type: string;
    attachment_r2_key: string | null; attachment_meta_encrypted: string | null;
    created_at: number; edited_at: number | null; deleted_at: number | null;
  }>();

  const messages = rows.results.map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    ciphertext: arrayBufferToBase64(m.ciphertext),
    iv: arrayBufferToBase64(m.iv),
    keyVersion: m.key_version,
    contentType: m.content_type,
    attachmentR2Key: m.attachment_r2_key,
    attachmentMetaEncrypted: m.attachment_meta_encrypted,
    createdAt: m.created_at,
    editedAt: m.edited_at,
    deletedAt: m.deleted_at,
  }));
  return c.json({ messages });
});

// ============================================================
// POST /rooms/:id/messages
// ============================================================
const sendMessageSchema = z.object({
  ciphertext: z.string().min(1),         // base64
  iv: z.string().min(1),                 // base64
  keyVersion: z.number().int().positive(),
  contentType: z.enum(['text', 'file', 'image', 'system']).default('text'),
  attachmentR2Key: z.string().optional(),
  attachmentMetaEncrypted: z.string().optional(),
});
chatRouter.post('/:id/messages', async (c) => {
  const parsed = sendMessageSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
  const u = c.get('user')!;
  const roomId = c.req.param('id');

  const member = await c.env.DB.prepare(`SELECT key_version FROM room_members WHERE room_id = ? AND user_id = ?`)
    .bind(roomId, u.id).first<{ key_version: number }>();
  if (!member) return c.json({ error: 'forbidden' }, 403);

  const msgId = ulid();
  const now = Date.now();
  const ct = fromBase64(parsed.data.ciphertext);
  const iv = fromBase64(parsed.data.iv);

  await c.env.DB.prepare(`
    INSERT INTO messages (id, room_id, sender_id, ciphertext, iv, key_version, content_type, attachment_r2_key, attachment_meta_encrypted, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    msgId, roomId, u.id, ct, iv, parsed.data.keyVersion,
    parsed.data.contentType, parsed.data.attachmentR2Key ?? null, parsed.data.attachmentMetaEncrypted ?? null,
    now,
  ).run();

  // Notify DO subscribers (fire-and-forget)
  try {
    const id = c.env.CHAT_ROOM.idFromName(roomId);
    await c.env.CHAT_ROOM.get(id).fetch('https://chat/broadcast', {
      method: 'POST',
      body: JSON.stringify({ type: 'message.new', data: { id: msgId, roomId, senderId: u.id, createdAt: now } }),
    });
  } catch {
    // Non-fatal; client will get the message on next fetch
  }

  return c.json({ id: msgId, createdAt: now });
});

// ============================================================
// WS  /rooms/:id/socket  — upgrade to ChatRoom DO websocket
// ============================================================
chatRouter.get('/:id/socket', async (c) => {
  const u = c.get('user')!;
  const roomId = c.req.param('id');
  const member = await c.env.DB.prepare(`SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?`)
    .bind(roomId, u.id).first();
  if (!member) return c.json({ error: 'forbidden' }, 403);

  if (c.req.header('upgrade') !== 'websocket') {
    return c.json({ error: 'expected_websocket' }, 426);
  }
  const id = c.env.CHAT_ROOM.idFromName(roomId);
  const stub = c.env.CHAT_ROOM.get(id);
  return stub.fetch(new Request('https://chat/socket', {
    headers: {
      upgrade: 'websocket',
      'x-user-id': u.id,
    },
  }));
});

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}
