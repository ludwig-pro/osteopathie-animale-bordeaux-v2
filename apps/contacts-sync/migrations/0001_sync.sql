CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'paused' CHECK (mode IN ('paused','simulate','pilot','live')),
  last_success INTEGER,
  last_error TEXT,
  retry_at INTEGER NOT NULL DEFAULT 0,
  turn INTEGER NOT NULL DEFAULT 0,
  next_scan INTEGER NOT NULL DEFAULT 0,
  scan_cursor TEXT,
  scan_active INTEGER NOT NULL DEFAULT 0,
  index_cursor TEXT,
  index_generation TEXT,
  index_complete INTEGER NOT NULL DEFAULT 0,
  index_active INTEGER NOT NULL DEFAULT 0,
  google_group TEXT,
  lease_owner TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT INTO settings(id) VALUES (1);
CREATE TABLE contacts (
  email TEXT PRIMARY KEY,
  marker TEXT NOT NULL UNIQUE,
  resource_name TEXT UNIQUE,
  last_block TEXT,
  pending_block TEXT,
  creation_attempted INTEGER NOT NULL DEFAULT 0,
  pilot_allowed INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER,
  outcome TEXT
);
CREATE TABLE bookings (
  uri TEXT PRIMARY KEY,
  event_uri TEXT NOT NULL,
  email TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX bookings_email ON bookings(email);
CREATE TABLE google_index (
  resource_name TEXT NOT NULL,
  email TEXT NOT NULL,
  marker TEXT,
  generation TEXT NOT NULL,
  PRIMARY KEY(resource_name,email)
);
CREATE INDEX google_index_email ON google_index(email);
CREATE INDEX google_index_marker ON google_index(marker);
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('event','invitee','contact')),
  payload TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','done','conflict')),
  attempts INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX jobs_due ON jobs(state,due_at,kind);
