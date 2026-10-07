-- Independent from replaceable snapshots. All before/after data remains private.
CREATE TABLE identity_reviews (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('apply', 'restore')),
  before_document TEXT NOT NULL,
  after_document TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX identity_reviews_contact ON identity_reviews(contact_id, created_at);
CREATE TABLE contact_animals (
  contact_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('calendly', 'name', 'manual')),
  review_id TEXT NOT NULL REFERENCES identity_reviews(id),
  PRIMARY KEY(contact_id, id)
);
CREATE TRIGGER apply_identity_review AFTER INSERT ON identity_reviews
BEGIN
  UPDATE copied_contacts SET document = NEW.after_document,
    etag = json_extract(NEW.after_document, '$.etag')
    WHERE snapshot_id = NEW.snapshot_id AND id = NEW.contact_id;
  DELETE FROM contact_animals WHERE contact_id = NEW.contact_id;
  INSERT INTO contact_animals(contact_id, id, name, source, review_id)
    SELECT NEW.contact_id, json_extract(value, '$.id'), json_extract(value, '$.name'),
      json_extract(value, '$.source'), NEW.id
    FROM json_each(NEW.after_document, '$.identity.animals');
END;
-- Also protects against older production Workers importing a new snapshot.
CREATE TRIGGER protect_reviewed_snapshot BEFORE UPDATE OF active_snapshot ON preview_state
WHEN NEW.active_snapshot IS NOT OLD.active_snapshot AND EXISTS(SELECT 1 FROM identity_reviews)
BEGIN
  SELECT RAISE(ABORT, 'preview_has_corrections');
END;
