ALTER TABLE settings ADD COLUMN google_sync_token TEXT;
-- Page size and requestSyncToken are part of Google's cursor contract.
-- Discard only the old inventory cursor, never bookings, contacts or jobs.
UPDATE settings SET index_active=0,index_cursor=NULL,index_complete=0;
