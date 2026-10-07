CREATE TABLE mailing_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  archived_at TEXT
);

CREATE TABLE mailing_list_contacts (
  list_id TEXT NOT NULL REFERENCES mailing_lists(id),
  google_resource_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  PRIMARY KEY (list_id, google_resource_name)
);

CREATE INDEX mailing_list_contacts_by_contact ON mailing_list_contacts(google_resource_name);
