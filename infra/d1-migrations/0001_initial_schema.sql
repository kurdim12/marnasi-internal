-- Maranasi Intranet — initial schema
-- All tables use INTEGER unix-millis timestamps for portability across D1.

PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name_ar TEXT,
  display_name_en TEXT,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('staff', 'manager', 'hr', 'admin', 'owner')),
  department TEXT,
  phone TEXT,
  avatar_r2_key TEXT,
  identity_pubkey TEXT NOT NULL,
  signed_prekey TEXT NOT NULL,
  signed_prekey_sig TEXT NOT NULL,
  signed_prekey_rotated_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  totp_secret TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- ============================================================
-- ONE-TIME PREKEYS  (X3DH replenishable)
-- ============================================================
CREATE TABLE one_time_prekeys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pubkey TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_prekeys_user_avail ON one_time_prekeys(user_id, consumed);

-- ============================================================
-- ROOMS  (metadata only; content E2EE)
-- ============================================================
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dm', 'group', 'channel')),
  name_encrypted TEXT,
  current_key_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wrapped_room_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at INTEGER NOT NULL,
  last_read_message_id TEXT,
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX idx_room_members_user ON room_members(user_id);

-- ============================================================
-- MESSAGES  (ciphertext only)
-- ============================================================
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  ciphertext BLOB NOT NULL,
  iv BLOB NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  content_type TEXT NOT NULL DEFAULT 'text'
    CHECK (content_type IN ('text', 'file', 'image', 'system')),
  attachment_r2_key TEXT,
  attachment_meta_encrypted TEXT,
  created_at INTEGER NOT NULL,
  edited_at INTEGER,
  deleted_at INTEGER
);
CREATE INDEX idx_messages_room_created ON messages(room_id, created_at DESC);

-- ============================================================
-- ANONYMOUS REPORTS  (no link to users table — by design)
-- ============================================================
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL
    CHECK (category IN ('harassment', 'safety', 'financial', 'other')),
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  hr_key_id INTEGER NOT NULL REFERENCES hr_keys(id),
  ephemeral_pubkey TEXT NOT NULL,
  wrapped_aes_key TEXT NOT NULL,
  title_encrypted TEXT NOT NULL,
  body_encrypted TEXT NOT NULL,
  attachments_encrypted TEXT,
  tracking_code_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'triaged', 'investigating', 'resolved', 'closed')),
  status_note_encrypted TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_expires ON reports(expires_at);

-- ============================================================
-- HR KEY ROTATION
-- ============================================================
CREATE TABLE hr_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_key TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  retired_at INTEGER
);
CREATE INDEX idx_hr_keys_active ON hr_keys(active);

-- ============================================================
-- DOCUMENTS (server-side envelope encryption — NOT E2EE)
-- ============================================================
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  r2_key TEXT NOT NULL,
  envelope_key_wrapped TEXT NOT NULL,
  envelope_iv TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  visibility TEXT NOT NULL
    CHECK (visibility IN ('private', 'department', 'company')),
  department TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_documents_visibility ON documents(visibility, department);
CREATE INDEX idx_documents_deleted ON documents(deleted_at);

-- ============================================================
-- HR
-- ============================================================
CREATE TABLE leave_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL
    CHECK (type IN ('annual', 'sick', 'unpaid', 'maternity')),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id TEXT REFERENCES users(id),
  approver_note TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_leave_user ON leave_requests(user_id, created_at DESC);
CREATE INDEX idx_leave_status ON leave_requests(status, created_at DESC);

CREATE TABLE payslips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  period TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  wrapped_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, period)
);
CREATE INDEX idx_payslips_user_period ON payslips(user_id, period DESC);

-- ============================================================
-- AUDIT LOG  (append-only)
-- ============================================================
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- SESSIONS  (refresh tokens; access tokens are stateless JWTs)
-- ============================================================
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  device_label TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- INVITES  (admin → new employee)
-- ============================================================
CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  department TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_expires ON invites(expires_at);

-- ============================================================
-- ENCRYPTED PRIVATE KEY BUNDLE (for cross-device login)
-- The server stores opaque ciphertext only; cannot derive the KEK.
-- ============================================================
CREATE TABLE user_key_bundles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  kdf_salt TEXT NOT NULL,
  kdf_iterations INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
