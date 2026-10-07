// Explicit operator action: read existing D1 bookings; change only a local copy.
import { execFileSync } from 'node:child_process';
import { DatabaseSync, backup } from 'node:sqlite';
import { chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { bookingAnimalType } from '../../contacts-sync/src/animal-type.ts';
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
const config = arg('--config');
const database =
  arg('--database') ??
  fileURLToPath(
    new URL('../.credentials/local-backoffice.sqlite', import.meta.url)
  );
const apply = process.argv.includes('--apply');
if (!config)
  throw new Error('Indiquer --config vers la configuration contacts-sync.');
let result;
try {
  result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL(
            '../../../node_modules/wrangler/bin/wrangler.js',
            import.meta.url
          )
        ),
        'd1',
        'execute',
        'DB',
        '--remote',
        '--config',
        config,
        '--env',
        'production',
        '--command',
        "SELECT c.resource_name AS id, coalesce(json_extract(b.data,'$.animalType'),'') AS animalType, coalesce(json_extract(b.data,'$.breed'),'') AS breed FROM contacts c JOIN bookings b ON b.email=c.email WHERE c.resource_name IS NOT NULL",
        '--json',
      ],
      {
        maxBuffer: 16 * 1024 * 1024,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          WRANGLER_WRITE_LOGS: 'false',
          WRANGLER_SEND_METRICS: 'false',
        },
      }
    )
  );
} catch {
  throw new Error('Lecture D1 impossible. Vérifier les accès Cloudflare.');
}
if (result.length !== 1 || result[0].success !== true)
  throw new Error('Lecture D1 incomplète.');
const types = new Map();
let recognized = 0;
for (const row of result[0].results) {
  const type = bookingAnimalType(row);
  if (!type) continue;
  recognized++;
  if (!types.has(row.id)) types.set(row.id, new Set());
  types.get(row.id).add(type);
}
const db = new DatabaseSync(database, { readOnly: !apply });
let updated = 0,
  before = 0,
  after = 0,
  total = 0;
try {
  if (apply) {
    const path = `${database}.species-${Date.now()}.backup.sqlite`;
    await backup(db, path);
    chmodSync(path, 0o600);
    db.exec('BEGIN IMMEDIATE');
  }
  const rows = db
    .prepare(
      'SELECT snapshot_id,id,document FROM copied_contacts WHERE snapshot_id=(SELECT active_snapshot FROM preview_state WHERE id=1)'
    )
    .all();
  total = rows.length;
  for (const row of rows) {
    const contact = JSON.parse(row.document);
    if (contact.animalTypes?.length) before++;
    const animalTypes = [
      ...new Set([
        ...(contact.animalTypes ?? []),
        ...(types.get(row.id) ?? []),
      ]),
    ].sort();
    if (animalTypes.length) after++;
    if (
      JSON.stringify(animalTypes) ===
      JSON.stringify([...(contact.animalTypes ?? [])].sort())
    )
      continue;
    updated++;
    if (apply)
      db.prepare(
        'UPDATE copied_contacts SET document=? WHERE snapshot_id=? AND id=?'
      ).run(
        JSON.stringify({ ...contact, animalTypes }),
        row.snapshot_id,
        row.id
      );
  }
  if (apply) db.exec('COMMIT');
} catch (error) {
  if (apply && db.isTransaction) db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
console.log(
  JSON.stringify({
    mode: apply ? 'applied' : 'dry-run',
    bookings: result[0].results.length,
    recognizedBookings: recognized,
    totalContacts: total,
    contactsWithSpeciesBefore: before,
    contactsWithSpeciesAfter: after,
    updatedContacts: updated,
  })
);
