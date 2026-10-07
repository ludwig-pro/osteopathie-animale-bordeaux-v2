import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { businessSnapshotQuery } from '../src/copy-data.ts';

export const localPreviewPath = new URL(
  '../.credentials/local-preview-data.json',
  import.meta.url
);

// One read-only statement: contacts, labels and lists come from the same read.
export const previewSnapshotQuery = `
SELECT * FROM (
SELECT 'state' AS kind, json_object(
  'snapshotId', p.active_snapshot,
  'appointmentsAvailable', coalesce(s.appointments_available, 1),
  'dataVersion', coalesce(s.data_version, 0),
  'copiedAt', s.created_at
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
UNION ALL
SELECT 'businessRows', json_object('table_name',table_name,'row_id',row_id,'document',document) FROM (${businessSnapshotQuery})
UNION ALL
SELECT 'contactSources', document FROM copied_contact_sources WHERE snapshot_id=(SELECT active_snapshot FROM preview_state WHERE id=1)
UNION ALL
SELECT 'calendar', document FROM copied_calendar WHERE snapshot_id=(SELECT active_snapshot FROM preview_state WHERE id=1)
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
    businessRows: [],
    contactSources: [],
    calendar: [],
    dataVersion: 0,
    copiedAt: null,
  };
  const state = rows.find((row) => row.kind === 'state');
  if (!state) throw new Error('État de la preview indisponible.');
  const metadata = JSON.parse(state.document);
  data.snapshotId = metadata.snapshotId;
  data.appointmentsAvailable = metadata.appointmentsAvailable === 1;
  data.dataVersion = metadata.dataVersion ?? 0;
  data.copiedAt = metadata.copiedAt ?? null;
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
  if (
    data.dataVersion === 1 &&
    (!Array.isArray(data.businessRows) ||
      !Array.isArray(data.contactSources) ||
      !Array.isArray(data.calendar) ||
      data.calendar.length !== 1)
  )
    throw new Error(
      'Copie de production incomplète. Relancer la copie avant preview:pull.'
    );
  return data;
}

export async function loadLocalPreview({
  demo = false,
  path = localPreviewPath,
} = {}) {
  if (demo) return null;
  const data = await readLocalPreview(path);
  if (!data)
    throw new Error(
      'Copie de production absente. Lancer yarn preview:pull:backoffice avant le serveur local. Le mode fictif doit être demandé explicitement avec BACKOFFICE_PREVIEW_DEMO=1.'
    );
  return data;
}
