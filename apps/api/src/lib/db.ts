import type { D1Database } from '@cloudflare/workers-types';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name_ar: string | null;
  display_name_en: string | null;
  role: 'staff' | 'manager' | 'hr' | 'admin' | 'owner';
  department: string | null;
  phone: string | null;
  avatar_r2_key: string | null;
  identity_pubkey: string;
  signed_prekey: string;
  signed_prekey_sig: string;
  signed_prekey_rotated_at: number;
  status: 'active' | 'suspended' | 'deleted';
  totp_secret: string | null;
  created_at: number;
  last_seen_at: number | null;
}

export interface InviteRow {
  id: string;
  email: string;
  role: string;
  department: string | null;
  token_hash: string;
  invited_by: string;
  created_at: number;
  expires_at: number;
  consumed_at: number | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_label: string | null;
  ip_hash: string | null;
  user_agent_hash: string | null;
  created_at: number;
  expires_at: number;
  revoked_at: number | null;
}

export interface RoomRow {
  id: string;
  type: 'dm' | 'group' | 'channel';
  name_encrypted: string | null;
  current_key_version: number;
  created_by: string;
  created_at: number;
}

export interface RoomMemberRow {
  room_id: string;
  user_id: string;
  wrapped_room_key: string;
  key_version: number;
  role: 'owner' | 'admin' | 'member';
  joined_at: number;
  last_read_message_id: string | null;
}

export interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  key_version: number;
  content_type: 'text' | 'file' | 'image' | 'system';
  attachment_r2_key: string | null;
  attachment_meta_encrypted: string | null;
  created_at: number;
  edited_at: number | null;
  deleted_at: number | null;
}

export interface ReportRow {
  id: string;
  category: string;
  severity: string;
  hr_key_id: number;
  ephemeral_pubkey: string;
  wrapped_aes_key: string;
  title_encrypted: string;
  body_encrypted: string;
  attachments_encrypted: string | null;
  tracking_code_hash: string;
  status: string;
  status_note_encrypted: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number;
}

export interface HrKeyRow {
  id: number;
  public_key: string;
  active: number;
  created_at: number;
  retired_at: number | null;
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').bind(email).first<UserRow>();
}

export async function getActiveHrKey(db: D1Database): Promise<HrKeyRow | null> {
  return db.prepare('SELECT * FROM hr_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1').first<HrKeyRow>();
}

export async function getHrKeyById(db: D1Database, id: number): Promise<HrKeyRow | null> {
  return db.prepare('SELECT * FROM hr_keys WHERE id = ?').bind(id).first<HrKeyRow>();
}
