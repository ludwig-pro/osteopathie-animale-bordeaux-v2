CREATE TABLE summary_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'paused' CHECK (mode IN ('paused','observe','pilot','live')),
  pilot_limit INTEGER NOT NULL DEFAULT 20,
  next_scan INTEGER NOT NULL DEFAULT 0,
  scan_generation TEXT,
  scan_cursor TEXT,
  scan_active INTEGER NOT NULL DEFAULT 0,
  retry_at INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  lease_owner TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
INSERT INTO summary_settings(id) VALUES (1);

CREATE TABLE contact_summary_sources (
  contact_id TEXT PRIMARY KEY,
  document TEXT,
  source_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('ready','review','insufficient','deleted')),
  observed_at TEXT NOT NULL,
  scan_generation TEXT
);

CREATE TABLE contact_summaries (
  contact_id TEXT PRIMARY KEY REFERENCES contact_summary_sources(contact_id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL,
  document TEXT NOT NULL,
  sources TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL
);

CREATE TABLE summary_jobs (
  contact_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('refresh','generate')),
  source_hash TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','done','error')),
  attempts INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  PRIMARY KEY (contact_id,kind)
);
CREATE INDEX summary_jobs_due ON summary_jobs(state,due_at,kind);
-- Reserve distinct contacts before any model call, including uncertain outcomes.
CREATE TABLE summary_pilot_contacts (contact_id TEXT PRIMARY KEY);
CREATE TRIGGER enforce_summary_pilot_limit BEFORE INSERT ON summary_pilot_contacts
WHEN NOT EXISTS(SELECT 1 FROM summary_pilot_contacts WHERE contact_id=NEW.contact_id)
  AND (SELECT COUNT(*) FROM summary_pilot_contacts) >= (SELECT pilot_limit FROM summary_settings WHERE id=1)
BEGIN
  SELECT RAISE(ABORT, 'summary_pilot_limit');
END;
