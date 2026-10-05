-- Diagnostic flags only: never store Google notes or contact details here.
ALTER TABLE contacts ADD COLUMN notes_review TEXT;
