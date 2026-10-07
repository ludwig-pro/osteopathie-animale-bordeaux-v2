// Explicit local enrichment from existing booking species words; no Google writes.
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { animalTypeFrom } from '../../contacts-sync/src/animal-type.ts';
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
    "SELECT DISTINCT c.resource_name AS id, coalesce(json_extract(b.data,'$.animalType'),json_extract(b.data,'$.breed'),'') AS species FROM contacts c JOIN bookings b ON b.email=c.email WHERE c.resource_name IS NOT NULL",
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
const types = new Map();
for (const row of rows) {
  const type = animalTypeFrom(row.species);
  if (type) {
    if (!types.has(row.id)) types.set(row.id, new Set());
    types.get(row.id).add(type);
  }
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
    const animalTypes = types.get(row.id);
    if (!animalTypes) continue;
    const contact = JSON.parse(row.document);
    contact.animalTypes = [...animalTypes].sort();
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
    contactsWithExplicitSpecies: updated,
  })
);
