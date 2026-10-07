-- Private business data copied from production. Operational secrets and runners
-- remain environment-specific. Keep previous snapshots as recoverable backups.
ALTER TABLE contact_snapshots ADD COLUMN data_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE preview_state ADD COLUMN importing_business INTEGER NOT NULL DEFAULT 0;
CREATE TABLE copied_business_rows (
  snapshot_id TEXT NOT NULL REFERENCES contact_snapshots(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  document TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, table_name, row_id)
);
CREATE TABLE copied_contact_sources (
  snapshot_id TEXT NOT NULL REFERENCES contact_snapshots(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  document TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, contact_id)
);
CREATE TABLE copied_calendar (
  snapshot_id TEXT PRIMARY KEY REFERENCES contact_snapshots(id) ON DELETE CASCADE,
  document TEXT NOT NULL
);
-- Replacement now archives the previous business data in the same transaction.
DROP TRIGGER protect_reviewed_snapshot;
DROP TRIGGER protect_reviewed_import;
CREATE TRIGGER protect_reviewed_snapshot BEFORE UPDATE OF active_snapshot ON preview_state
WHEN NEW.active_snapshot IS NOT OLD.active_snapshot AND EXISTS(SELECT 1 FROM identity_reviews)
  AND coalesce((SELECT data_version FROM contact_snapshots WHERE id=NEW.active_snapshot),0) != 1
BEGIN
  SELECT RAISE(ABORT, 'preview_has_corrections');
END;
CREATE TRIGGER protect_reviewed_import BEFORE UPDATE OF import_id ON preview_state
WHEN NEW.import_id IS NOT NULL AND NEW.import_id IS NOT OLD.import_id
  AND EXISTS(SELECT 1 FROM identity_reviews)
  AND coalesce((SELECT data_version FROM contact_snapshots WHERE id=NEW.import_id),0) != -1
BEGIN
  SELECT RAISE(ABORT, 'preview_has_corrections');
END;
DROP TRIGGER apply_identity_review;
CREATE TRIGGER apply_identity_review AFTER INSERT ON identity_reviews
WHEN (SELECT importing_business FROM preview_state WHERE id=1)=0
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
