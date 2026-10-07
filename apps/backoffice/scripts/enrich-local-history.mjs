// Explicit read of existing bookings into the local copy. No remote writes.
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
const output = execFileSync(
  process.execPath,
  [
    fileURLToPath(
      new URL('../../../node_modules/wrangler/bin/wrangler.js', import.meta.url)
    ),
    'd1',
    'execute',
    'osteo-contacts-sync-production',
    '--remote',
    '--command',
    "SELECT c.resource_name AS contact_id,b.uri AS id,json_extract(b.data,'$.start') AS date,coalesce(json_extract(b.data,'$.animal'),'') AS animal,json_extract(b.data,'$.status') AS status FROM contacts c JOIN bookings b ON b.email=c.email WHERE c.resource_name IS NOT NULL ORDER BY date DESC",
    '--json',
  ],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: 'false',
      WRANGLER_SEND_METRICS: 'false',
    },
  }
);
const rows = JSON.parse(output.toString())[0].results;
const history = new Map();
for (const { contact_id, ...event } of rows) {
  if (!history.has(contact_id)) history.set(contact_id, []);
  history.get(contact_id).push({ ...event, type: 'appointment' });
}
const db = new DatabaseSync(
  fileURLToPath(
    new URL('../.credentials/local-backoffice.sqlite', import.meta.url)
  )
);
let updated = 0;
db.exec('BEGIN');
try {
  for (const row of db
    .prepare(
      'SELECT snapshot_id,id,document FROM copied_contacts WHERE snapshot_id=(SELECT active_snapshot FROM preview_state WHERE id=1)'
    )
    .all()) {
    const contact = JSON.parse(row.document);
    contact.history = history.get(row.id) ?? [];
    db.prepare(
      'UPDATE copied_contacts SET document=? WHERE snapshot_id=? AND id=?'
    ).run(JSON.stringify(contact), row.snapshot_id, row.id);
    updated++;
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
console.log(
  JSON.stringify({
    bookingAssociations: rows.length,
    contactsWithHistoryLoaded: updated,
  })
);
