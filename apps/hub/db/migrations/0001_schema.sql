-- Maranasi Hub — initial schema (D1 / SQLite)
-- Mirrors the canonical schema in the brief (Section 4), adapted to SQLite:
-- TEXT ids, INTEGER unix-millis timestamps, CHECK constraints for enums,
-- INTEGER(0/1) booleans, JSON stored as TEXT.

PRAGMA foreign_keys = ON;

-- Staff / internal users -----------------------------------------------
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','producer','coordinator','assistant')),
  avatar_color TEXT,
  phone TEXT,
  language_preference TEXT NOT NULL DEFAULT 'en',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- End clients ----------------------------------------------------------
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  language_preference TEXT NOT NULL DEFAULT 'ar',
  is_corporate INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Vendor database -----------------------------------------------------
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'catering','floral','photography','videography','lighting',
    'sound','venue','decor','entertainment','transport','other')),
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  whatsapp_number TEXT,
  notes TEXT,
  rating REAL CHECK (rating BETWEEN 0 AND 5),
  times_used INTEGER NOT NULL DEFAULT 0,
  last_used_date TEXT,
  average_cost_jod REAL,
  is_preferred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Incoming leads ------------------------------------------------------
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id),
  client_name TEXT NOT NULL,
  event_type TEXT,
  estimated_guest_count INTEGER,
  preferred_venue TEXT,
  preferred_date TEXT,
  tier TEXT,
  source TEXT,
  raw_message TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','proposal_sent','won','lost','archived')),
  note_key TEXT,
  received_at INTEGER NOT NULL,
  assigned_to TEXT REFERENCES profiles(user_id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_leads_status ON leads(status, created_at DESC);

-- Confirmed / in-flight events ----------------------------------------
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  client_id TEXT REFERENCES clients(id),
  name TEXT NOT NULL,
  event_type TEXT,
  event_date INTEGER NOT NULL,
  venue TEXT,
  venue_address TEXT,
  guest_count INTEGER,
  tier TEXT,
  status TEXT NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning','in_production','day_of','completed','archived')),
  total_budget_jod REAL,
  cover_image_url TEXT,
  gradient_from TEXT,
  gradient_to TEXT,
  producer_id TEXT REFERENCES profiles(user_id),
  tasks_total INTEGER NOT NULL DEFAULT 0,
  tasks_complete INTEGER NOT NULL DEFAULT 0,
  -- 0 = active pipeline (dashboard), 1 = completed portfolio (Library)
  is_library INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_events_status_date ON events(status, event_date ASC);
CREATE INDEX idx_events_library ON events(is_library, event_date);
CREATE INDEX idx_events_producer ON events(producer_id, status);

-- Vendor assignments (junction) ---------------------------------------
CREATE TABLE event_vendors (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES vendors(id),
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','contacted','confirmed','paid','completed','cancelled')),
  agreed_cost_jod REAL,
  paid_amount_jod REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_event_vendors_event ON event_vendors(event_id);

-- Production timeline items -------------------------------------------
CREATE TABLE event_tasks (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  due_date TEXT,
  assigned_to TEXT REFERENCES profiles(user_id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','blocked')),
  category TEXT,
  order_index INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_event_tasks_event ON event_tasks(event_id, order_index);

-- Generated decks -----------------------------------------------------
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  event_id TEXT REFERENCES events(id),
  version INTEGER NOT NULL DEFAULT 1,
  language TEXT,
  pptx_url TEXT,
  pdf_url TEXT,
  markdown_source TEXT,
  generated_by TEXT REFERENCES profiles(user_id),
  claude_tokens_used INTEGER,
  presenton_job_id TEXT,
  created_at INTEGER NOT NULL
);

-- Mood boards ---------------------------------------------------------
CREATE TABLE mood_boards (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT,
  images TEXT, -- JSON array of {url, source, alt_text, position}
  approved_by_client INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Client portal magic-link sessions -----------------------------------
CREATE TABLE client_sessions (
  token TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id),
  expires_at INTEGER,
  last_accessed_at INTEGER,
  created_at INTEGER NOT NULL
);

-- Universal audit / activity feed -------------------------------------
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id),
  lead_id TEXT REFERENCES leads(id),
  actor_id TEXT REFERENCES profiles(user_id),
  action TEXT,
  metadata TEXT, -- JSON
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_activity_event ON activity_log(event_id, created_at DESC);
