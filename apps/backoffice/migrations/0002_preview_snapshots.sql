-- Used only by the preview database; production stores no copied contacts here.
CREATE TABLE contact_snapshots (
  id TEXT PRIMARY KEY,
  appointments_available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE copied_contacts (
  snapshot_id TEXT NOT NULL REFERENCES contact_snapshots(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  etag TEXT NOT NULL,
  document TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, id)
);
CREATE TABLE copied_labels (
  snapshot_id TEXT NOT NULL REFERENCES contact_snapshots(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  document TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, id)
);
CREATE TABLE preview_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_snapshot TEXT REFERENCES contact_snapshots(id),
  import_id TEXT,
  import_expires_at INTEGER,
  phase TEXT,
  cursor TEXT,
  copied INTEGER NOT NULL DEFAULT 0,
  busy_id TEXT,
  busy_expires_at INTEGER
);
INSERT INTO preview_state (id) VALUES (1);
