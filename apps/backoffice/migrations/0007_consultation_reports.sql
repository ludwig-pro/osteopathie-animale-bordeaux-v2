-- Originals live in private object storage, never in public assets or snapshots.
CREATE TABLE consultation_reports (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  message_id TEXT NOT NULL,
  attachment_index INTEGER NOT NULL,
  filename TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  recipients TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size INTEGER NOT NULL CHECK(size > 0),
  contact_id TEXT,
  match_status TEXT NOT NULL CHECK(match_status IN ('linked', 'unmatched', 'ambiguous')),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account, message_id, attachment_index),
  CHECK((contact_id IS NOT NULL) = (match_status = 'linked'))
);
CREATE INDEX consultation_reports_contact ON consultation_reports(contact_id, sent_at);
