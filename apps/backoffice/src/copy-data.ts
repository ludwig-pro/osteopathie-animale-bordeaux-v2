import type { Env } from './config.ts';
import { ContactsError } from './contacts.ts';

// Explicit business-data allowlist; no secrets, cron leases or operator modes.
export const copyTables = [
  {
    name: 'mailing_lists',
    columns: [
      'id',
      'name',
      'description',
      'created_at',
      'updated_at',
      'archived_at',
    ],
    keys: ['id'],
  },
  {
    name: 'mailing_list_contacts',
    columns: ['list_id', 'google_resource_name', 'status'],
    keys: ['list_id', 'google_resource_name'],
  },
  {
    name: 'identity_reviews',
    columns: [
      'id',
      'contact_id',
      'snapshot_id',
      'actor',
      'action',
      'before_document',
      'after_document',
      'created_at',
    ],
    keys: ['id'],
  },
  {
    name: 'contact_animals',
    columns: ['contact_id', 'id', 'name', 'source', 'review_id'],
    keys: ['contact_id', 'id'],
  },
  {
    name: 'known_contact_animals',
    columns: ['contact_id', 'animal_key', 'name'],
    keys: ['contact_id', 'animal_key'],
  },
  {
    name: 'contact_animal_overrides',
    columns: ['contact_id', 'names', 'version'],
    keys: ['contact_id'],
  },
  {
    name: 'consultation_reports',
    columns: [
      'id',
      'account',
      'message_id',
      'attachment_index',
      'filename',
      'sent_at',
      'recipients',
      'sha256',
      'size',
      'contact_id',
      'match_status',
      'imported_at',
    ],
    keys: ['id'],
  },
  {
    name: 'gmail_import_messages',
    columns: [
      'account',
      'gmail_id',
      'parser_version',
      'report_count',
      'processed_at',
    ],
    keys: ['account', 'gmail_id', 'parser_version'],
  },
  {
    name: 'contact_summary_sources',
    columns: [
      'contact_id',
      'document',
      'source_hash',
      'state',
      'observed_at',
      'scan_generation',
    ],
    keys: ['contact_id'],
  },
  {
    name: 'contact_summaries',
    columns: [
      'contact_id',
      'source_hash',
      'document',
      'sources',
      'model',
      'prompt_version',
      'generated_at',
      'input_tokens',
      'output_tokens',
      'duration_ms',
    ],
    keys: ['contact_id'],
  },
  {
    name: 'summary_jobs',
    columns: [
      'contact_id',
      'kind',
      'source_hash',
      'version',
      'state',
      'attempts',
      'due_at',
      'error_code',
    ],
    keys: ['contact_id', 'kind'],
  },
] as const;

// Hosted D1 permits only 5 terms per compound SELECT. Nest bounded groups so adding
// the summary tables does not make a complete snapshot fail on hosted D1.
const tableQueries = copyTables.map(
  ({ name, columns, keys }) =>
    `SELECT '${name}' AS table_name, json_array(${keys.join(',')}) AS row_id, json_object(${columns.map((column) => `'${column}',${column}`).join(',')}) AS document FROM ${name}`
);
export const businessSnapshotQuery = [
  tableQueries.slice(0, 5),
  tableQueries.slice(5, 10),
  tableQueries.slice(10),
]
  .filter((queries) => queries.length)
  .map((queries) => `SELECT * FROM (${queries.join(' UNION ALL ')})`)
  .join(' UNION ALL ');

export async function copyBusinessPage(
  env: Env,
  snapshot: string,
  lease: string,
  cursor: string | null
) {
  if (!env.DB || !env.PREVIEW_DB)
    throw new ContactsError(503, 'preview_copy_unavailable');
  const rows = await env.DB.prepare(
    `SELECT * FROM (${businessSnapshotQuery}) WHERE table_name || ':' || row_id > ? ORDER BY table_name || ':' || row_id LIMIT 21`
  )
    .bind(cursor ?? '')
    .all<{ table_name: string; row_id: string; document: string }>();
  const page = rows.results.slice(0, 20);
  // Copy immutable PDF bytes before making their metadata visible. A missing
  // object aborts the copy; an unavailable source is never an empty source.
  for (const row of page) {
    if (row.table_name !== 'consultation_reports') continue;
    const report = JSON.parse(row.document) as { sha256: string; size: number };
    if (
      !/^[a-f0-9]{64}$/.test(report.sha256) ||
      !env.REPORTS ||
      !env.PREVIEW_REPORTS
    )
      throw new ContactsError(503, 'preview_copy_reports_unavailable');
    const key = `${report.sha256}.pdf`;
    const object = await env.REPORTS.get(key);
    if (!object)
      throw new ContactsError(503, 'preview_copy_reports_unavailable');
    await env.PREVIEW_REPORTS.put(key, object.body, {
      httpMetadata: { contentType: 'application/pdf' },
    });
  }
  if (page.length)
    await env.PREVIEW_DB.prepare(
      `INSERT INTO copied_business_rows(snapshot_id,table_name,row_id,document)
     SELECT ?,json_extract(value,'$.table_name'),json_extract(value,'$.row_id'),json_extract(value,'$.document') FROM json_each(?)
     WHERE EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)
     ON CONFLICT(snapshot_id,table_name,row_id) DO UPDATE SET document=excluded.document`
    )
      .bind(snapshot, JSON.stringify(page), snapshot, lease)
      .run();
  const last = page.at(-1);
  return rows.results.length > 20 && last
    ? `${last.table_name}:${last.row_id}`
    : null;
}

export async function businessCopyMatches(env: Env, snapshot: string) {
  const [source, copied] = await Promise.all([
    env
      .DB!.prepare(
        `SELECT * FROM (${businessSnapshotQuery}) ORDER BY table_name,row_id`
      )
      .all<{ table_name: string; row_id: string; document: string }>(),
    env
      .PREVIEW_DB!.prepare(
        'SELECT table_name,row_id,document FROM copied_business_rows WHERE snapshot_id=? ORDER BY table_name,row_id'
      )
      .bind(snapshot)
      .all<{ table_name: string; row_id: string; document: string }>(),
  ]);
  const fingerprint = async (rows: typeof source.results) => {
    const bytes = new TextEncoder().encode(
      JSON.stringify(
        rows.map((row) => [row.table_name, row.row_id, row.document])
      )
    );
    if (bytes.byteLength > 32 * 1024 * 1024) throw new Error('copy_too_large');
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  };
  const [before, after] = await Promise.all([
    fingerprint(source.results),
    fingerprint(copied.results),
  ]);
  return before.every((byte, index) => byte === after[index]);
}

export function activateBusinessCopy(
  db: D1Database,
  snapshot: string,
  lease: string
) {
  const guard =
    'EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)';
  const statements = [
    // Preserve the complete previous state, including local/preview corrections.
    db
      .prepare(
        `INSERT OR REPLACE INTO copied_business_rows(snapshot_id,table_name,row_id,document)
      SELECT active_snapshot,table_name,row_id,document FROM (${businessSnapshotQuery}),preview_state
      WHERE preview_state.id=1 AND active_snapshot IS NOT NULL AND ${guard}`
      )
      .bind(snapshot, lease),
    db
      .prepare(
        `UPDATE preview_state SET importing_business=1 WHERE id=1 AND ${guard}`
      )
      .bind(snapshot, lease),
  ];
  // Identity journals are copied without replaying their name/animal triggers.
  // Never disable schema protection globally, including across awaits.
  for (const { name } of [...copyTables].reverse())
    statements.push(
      db.prepare(`DELETE FROM ${name} WHERE ${guard}`).bind(snapshot, lease)
    );
  for (const { name, columns } of copyTables) {
    statements.push(
      db
        .prepare(
          `INSERT INTO ${name}(${columns.join(',')})
       SELECT ${columns.map((column) => `json_extract(document,'$.${column}')`).join(',')}
       FROM copied_business_rows WHERE snapshot_id=? AND table_name='${name}' AND ${guard}`
        )
        .bind(snapshot, snapshot, lease)
    );
  }
  statements.push(
    db
      .prepare(
        `UPDATE preview_state SET importing_business=0 WHERE id=1 AND ${guard}`
      )
      .bind(snapshot, lease)
  );
  return statements;
}
