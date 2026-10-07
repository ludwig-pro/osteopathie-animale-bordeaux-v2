-- Refuse imports before they acquire a lease, including older production callers.
-- Otherwise a refused activation could leave corrections blocked by import_id.
CREATE TRIGGER protect_reviewed_import BEFORE UPDATE OF import_id ON preview_state
WHEN NEW.import_id IS NOT NULL AND NEW.import_id IS NOT OLD.import_id
  AND EXISTS(SELECT 1 FROM identity_reviews)
BEGIN
  SELECT RAISE(ABORT, 'preview_has_corrections');
END;
