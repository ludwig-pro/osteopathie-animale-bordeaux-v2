import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';

export const localPreviewPath = new URL(
  '../.credentials/local-preview-data.json',
  import.meta.url
);

// One read-only statement: contacts, labels and lists come from the same read.
export const previewSnapshotQuery = `
SELECT * FROM (
SELECT 'state' AS kind, json_object(
  'snapshotId', p.active_snapshot,
  'appointmentsAvailable', coalesce(s.appointments_available, 1)
) AS document FROM preview_state p
LEFT JOIN contact_snapshots s ON s.id = p.active_snapshot WHERE p.id = 1
UNION ALL
SELECT 'contacts', document FROM copied_contacts
WHERE snapshot_id = (SELECT active_snapshot FROM preview_state WHERE id = 1)
UNION ALL
SELECT 'labels', document FROM copied_labels
WHERE snapshot_id = (SELECT active_snapshot FROM preview_state WHERE id = 1)
UNION ALL
SELECT CASE WHEN archived_at IS NULL THEN 'lists' ELSE 'archivedLists' END,
json_object('id', id, 'name', name, 'description', description) FROM mailing_lists
)
UNION ALL
SELECT * FROM (
SELECT 'memberships', json_object('listId', list_id,
  'contactId', google_resource_name, 'status', status) FROM mailing_list_contacts
UNION ALL
SELECT 'identityReviews', json_object('id',id,'contact_id',contact_id,'snapshot_id',snapshot_id,'actor',actor,'action',action,'before_document',before_document,'after_document',after_document,'created_at',created_at) FROM identity_reviews
UNION ALL
SELECT 'contactAnimals', json_object('contact_id',contact_id,'id',id,'name',name,'source',source,'review_id',review_id) FROM contact_animals
UNION ALL
SELECT 'knownAnimals', json_object('contact_id',contact_id,'animal_key',animal_key,'name',name) FROM known_contact_animals
UNION ALL
SELECT 'animalOverrides', json_object('contact_id',contact_id,'names',names,'version',version) FROM contact_animal_overrides
)
`;

export function snapshotFromRows(rows) {
  const data = {
    version: 1,
    source: 'cloudflare-preview',
    importedAt: new Date().toISOString(),
    snapshotId: null,
    appointmentsAvailable: true,
    /** @type {import('../src/contact-types.ts').GoogleContact[]} */
    contacts: [],
    /** @type {import('../src/contact-types.ts').ContactLabel[]} */
    labels: [],
    /** @type {import('../src/contact-types.ts').MailingList[]} */
    lists: [],
    /** @type {import('../src/contact-types.ts').MailingList[]} */
    archivedLists: [],
    /** @type {import('../src/contact-types.ts').ListMembership[]} */
    memberships: [],
    identityReviews: [],
    contactAnimals: [],
    knownAnimals: [],
    animalOverrides: [],
  };
  const state = rows.find((row) => row.kind === 'state');
  if (!state) throw new Error('État de la preview indisponible.');
  const metadata = JSON.parse(state.document);
  data.snapshotId = metadata.snapshotId;
  data.appointmentsAvailable = metadata.appointmentsAvailable === 1;
  for (const row of rows) {
    if (row.kind === 'state') continue;
    if (!Array.isArray(data[row.kind]))
      throw new Error('Format de la copie invalide.');
    data[row.kind].push(JSON.parse(row.document));
  }
  for (const field of ['contacts', 'labels', 'lists', 'archivedLists'])
    data[field].sort((a, b) => a.id.localeCompare(b.id));
  return data;
}

export async function saveLocalPreview(data, path = localPreviewPath) {
  await mkdir(new URL('.', path), { recursive: true, mode: 0o700 });
  const temporary = new URL(`${path.href}.${crypto.randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(data), { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}

export async function readLocalPreview(path = localPreviewPath) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error('Impossible de lire la copie locale.');
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Copie locale invalide. Relancer preview:pull.');
  }
  if (
    data.version !== 1 ||
    data.source !== 'cloudflare-preview' ||
    !['contacts', 'labels', 'lists', 'archivedLists', 'memberships'].every(
      (field) => Array.isArray(data[field])
    )
  )
    throw new Error('Copie locale invalide. Relancer preview:pull.');
  return data;
}
