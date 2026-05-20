const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : (init.body as BodyInit | null | undefined),
  });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return null; } })() : null;
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? 'request_failed');
  }
  return data as T;
}

// Strongly-typed helpers
export const auth = {
  login: (body: { email: string; password: string; totp?: string; turnstileToken?: string }) =>
    api<{ ok: true; user: AuthUser }>('/auth/login', { method: 'POST', json: body }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  refresh: () => api('/auth/refresh', { method: 'POST' }),
  me: () => api<AuthUser>('/auth/me'),
  keyBundle: () => api<{ ciphertext: string; iv: string; kdfSalt: string; kdfIterations: number }>('/auth/key-bundle'),
  signupComplete: (body: SignupCompleteBody) =>
    api<{ ok: true }>('/auth/signup-complete', { method: 'POST', json: body }),
};

export interface AuthUser {
  id: string;
  email: string;
  role: 'staff' | 'manager' | 'hr' | 'admin' | 'owner';
  department: string | null;
  displayNameAr: string | null;
  displayNameEn: string | null;
  identityPubkey?: string;
}

export interface SignupCompleteBody {
  inviteToken: string;
  password: string;
  displayNameAr: string;
  displayNameEn: string;
  phone?: string;
  identityPubkey: string;
  signedPrekey: string;
  signedPrekeySig: string;
  oneTimePrekeys: string[];
  encryptedKeyBundle: { ciphertext: string; iv: string; kdfSalt: string; kdfIterations: number };
  turnstileToken?: string;
}

export const reports = {
  hrKey: () => api<{ id: number; publicKey: string }>('/reports/hr-key'),
  submit: (body: SubmitReportBody) => api<{ ok: true; reportId: string }>('/reports', { method: 'POST', json: body }),
  track: (body: { code: string; turnstileToken: string }) =>
    api<TrackedReport>('/reports/track', { method: 'POST', json: body }),
  inbox: (status?: string) => api<{ reports: AdminReport[] }>(`/admin/reports${status ? `?status=${status}` : ''}`),
  updateStatus: (id: string, body: { status: string; statusNoteEncrypted?: string }) =>
    api<{ ok: true }>(`/admin/reports/${id}/status`, { method: 'PATCH', json: body }),
};

export interface SubmitReportBody {
  category: 'harassment' | 'safety' | 'financial' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  hrKeyId: number;
  ephemeralPubkey: string;
  wrappedAesKey: string;
  titleEncrypted: string;
  bodyEncrypted: string;
  attachmentsEncrypted?: string;
  trackingCode: string;
  turnstileToken: string;
}

export interface TrackedReport {
  id: string;
  status: string;
  category: string;
  severity: string;
  statusNoteEncrypted: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdminReport {
  id: string;
  category: string;
  severity: string;
  hr_key_id: number;
  ephemeral_pubkey: string;
  wrapped_aes_key: string;
  title_encrypted: string;
  body_encrypted: string;
  attachments_encrypted: string | null;
  status: string;
  status_note_encrypted: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number;
}

export const chat = {
  myRooms: () => api<{ rooms: RoomSummary[] }>('/rooms'),
  room: (id: string) => api<{ room: RoomDetail; members: RoomMember[] }>(`/rooms/${id}`),
  messages: (roomId: string, opts: { before?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.before) q.set('before', String(opts.before));
    if (opts.limit) q.set('limit', String(opts.limit));
    return api<{ messages: EncryptedMessage[] }>(`/rooms/${roomId}/messages${q.toString() ? `?${q}` : ''}`);
  },
  send: (roomId: string, body: SendMessageBody) =>
    api<{ id: string; createdAt: number }>(`/rooms/${roomId}/messages`, { method: 'POST', json: body }),
  create: (body: CreateRoomBody) =>
    api<{ id: string; type: string; createdAt: number }>('/rooms', { method: 'POST', json: body }),
};

export interface RoomSummary {
  id: string;
  type: 'dm' | 'group' | 'channel';
  name_encrypted: string | null;
  current_key_version: number;
  wrapped_room_key: string;
  key_version: number;
  role: string;
  last_read_message_id: string | null;
  message_count: number;
  last_message_at: number | null;
  created_at: number;
}

export interface RoomDetail extends RoomSummary {
  created_by: string;
}

export interface RoomMember {
  user_id: string;
  role: string;
  key_version: number;
  display_name_ar: string | null;
  display_name_en: string | null;
  identity_pubkey: string;
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  ciphertext: string;
  iv: string;
  keyVersion: number;
  contentType: 'text' | 'file' | 'image' | 'system';
  attachmentR2Key: string | null;
  attachmentMetaEncrypted: string | null;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
}

export interface SendMessageBody {
  ciphertext: string;
  iv: string;
  keyVersion: number;
  contentType?: 'text' | 'file' | 'image';
  attachmentR2Key?: string;
  attachmentMetaEncrypted?: string;
}

export interface CreateRoomBody {
  type: 'dm' | 'group' | 'channel';
  nameEncrypted?: string;
  members: { userId: string; wrappedRoomKey: string; role?: 'owner' | 'admin' | 'member' }[];
}
