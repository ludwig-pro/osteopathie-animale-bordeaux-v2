-- Local operator import checkpoints; no credentials or MIME bodies.
CREATE TABLE gmail_import_messages (
  account TEXT NOT NULL,
  gmail_id TEXT NOT NULL,
  parser_version INTEGER NOT NULL,
  report_count INTEGER NOT NULL,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(account, gmail_id, parser_version)
);
