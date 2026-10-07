import { CONTACTS_ACCOUNT_EMAIL, type Env } from './config.ts';
import { ContactsError } from './contacts.ts';
import {
  SUMMARY_MODEL,
  SUMMARY_PROMPT_VERSION,
  sourceFingerprint,
  SummaryError,
} from './summary-model.ts';
import type {
  ContactSources,
  ContactSourcesPage,
  ContactSummaryView,
  SummaryDossier,
} from './summary-types.ts';

export const validContactId = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 200 &&
  /^people\/[\w-]+$/.test(value);

export function validateSources(value: unknown): ContactSources {
  const source = value as ContactSources | null;
  if (
    !source ||
    !validContactId(source.id) ||
    !['ready', 'review'].includes(source.notesState) ||
    !Number.isFinite(Date.parse(source.observedAt)) ||
    !Array.isArray(source.notes) ||
    !Array.isArray(source.appointments) ||
    !source.notes.every(
      (note) =>
        note &&
        typeof note.id === 'string' &&
        note.id &&
        note.kind === 'google-note' &&
        typeof note.text === 'string'
    ) ||
    !source.appointments.every(
      (appointment) =>
        appointment &&
        appointment.kind === 'appointment' &&
        typeof appointment.id === 'string' &&
        appointment.id &&
        Number.isFinite(Date.parse(appointment.date)) &&
        ['active', 'canceled'].includes(appointment.status) &&
        [
          appointment.animal,
          appointment.animalType,
          appointment.breed,
          appointment.birth,
          appointment.reason,
        ].every((value) => typeof value === 'string') &&
        [appointment.oldInvitee, appointment.newInvitee].every(
          (value) => value === null || typeof value === 'string'
        )
    ) ||
    new Set([...source.notes, ...source.appointments].map((item) => item.id))
      .size !==
      source.notes.length + source.appointments.length
  )
    throw new SummaryError('contact_sources_unavailable', true);
  return {
    id: source.id,
    notesState: source.notesState,
    observedAt: source.observedAt,
    notes: source.notes.map(({ id, kind, text }) => ({ id, kind, text })),
    appointments: source.appointments
      .map(
        ({
          id,
          kind,
          date,
          animal,
          animalType,
          breed,
          birth,
          reason,
          status,
          oldInvitee,
          newInvitee,
        }) => ({
          id,
          kind,
          date,
          animal,
          animalType,
          breed,
          birth,
          reason,
          status,
          oldInvitee,
          newInvitee,
        })
      )
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export async function fetchSummarySources(
  env: Env,
  id?: string,
  cursor?: string | null
): Promise<ContactSourcesPage> {
  if (env.APP_ENVIRONMENT !== 'production' || !env.GOOGLE_CONTACTS)
    throw new SummaryError('contact_sources_unavailable');
  const url = new URL(id ? '/source' : '/sources', 'https://contacts.internal');
  if (id) url.searchParams.set('id', id);
  if (cursor) url.searchParams.set('pageToken', cursor);
  let response: Response;
  try {
    response = await env.GOOGLE_CONTACTS.fetch(
      new Request(url, {
        headers: { 'X-Contacts-Account': CONTACTS_ACCOUNT_EMAIL },
        signal: AbortSignal.timeout(20000),
      })
    );
  } catch {
    throw new SummaryError('contact_sources_unavailable', true);
  }
  const data = (await response.json()) as ContactSourcesPage & {
    contact?: ContactSources;
    error?: string;
  };
  if (!response.ok) {
    if (id && response.status === 404 && data.error === 'contact_not_found')
      throw new SummaryError('contact_not_found');
    throw new SummaryError('contact_sources_unavailable', true);
  }
  if (id) {
    const contact = validateSources(data.contact);
    if (contact.id !== id)
      throw new SummaryError('contact_sources_unavailable', true);
    return { contacts: [contact], nextPageToken: null };
  }
  if (
    !Array.isArray(data.contacts) ||
    data.contacts.length > 100 ||
    (data.nextPageToken !== null &&
      (typeof data.nextPageToken !== 'string' ||
        !data.nextPageToken ||
        data.nextPageToken.length > 8192 ||
        data.nextPageToken === cursor))
  )
    throw new SummaryError('contact_sources_unavailable', true);
  return {
    contacts: data.contacts.map(validateSources),
    nextPageToken: data.nextPageToken,
  };
}

/** Shared ingestion boundary: future backoffice notes join the dossier here. */
export async function observeSummarySources(
  db: D1Database,
  contacts: ContactSources[],
  generation: string | null = null
) {
  if (!contacts.length) return;
  const ids = JSON.stringify(contacts.map((contact) => contact.id));
  const overrides = await db
    .prepare(
      'SELECT contact_id,names FROM contact_animal_overrides WHERE contact_id IN (SELECT value FROM json_each(?))'
    )
    .bind(ids)
    .all<{ contact_id: string; names: string | null }>();
  const known = await db
    .prepare(
      'SELECT contact_id,name FROM known_contact_animals WHERE contact_id IN (SELECT value FROM json_each(?)) ORDER BY animal_key'
    )
    .bind(ids)
    .all<{ contact_id: string; name: string }>();
  const byId = new Map(
    overrides.results.map((row) => [row.contact_id, row.names])
  );
  const rows = await Promise.all(
    contacts.map(async (contact) => {
      const override = byId.get(contact.id);
      const dossier: SummaryDossier = {
        ...contact,
        contextualAnimals: (override !== undefined && override !== null
          ? (JSON.parse(override) as string[])
          : [
              ...new Set([
                ...known.results
                  .filter((row) => row.contact_id === contact.id)
                  .map((row) => row.name),
                ...contact.appointments
                  .map((appointment) => appointment.animal)
                  .filter(Boolean),
              ]),
            ]
        ).sort(),
      };
      return {
        id: contact.id,
        document: JSON.stringify(dossier),
        hash: await sourceFingerprint(dossier),
        observedAt: contact.observedAt,
        state:
          contact.notesState === 'review'
            ? 'review'
            : contact.notes.length || contact.appointments.length
              ? 'ready'
              : 'insufficient',
      };
    })
  );
  const json = JSON.stringify(rows);
  await db.batch([
    db
      .prepare(
        `INSERT INTO contact_summary_sources(contact_id,document,source_hash,state,observed_at,scan_generation)
      SELECT json_extract(value,'$.id'),json_extract(value,'$.document'),json_extract(value,'$.hash'),json_extract(value,'$.state'),json_extract(value,'$.observedAt'),? FROM json_each(?) WHERE 1
      ON CONFLICT(contact_id) DO UPDATE SET document=excluded.document,source_hash=excluded.source_hash,state=excluded.state,observed_at=excluded.observed_at,scan_generation=COALESCE(excluded.scan_generation,contact_summary_sources.scan_generation)`
      )
      .bind(generation, json),
    db
      .prepare(
        `INSERT INTO summary_jobs(contact_id,kind,source_hash)
      SELECT json_extract(value,'$.id'),'generate',json_extract(value,'$.hash') FROM json_each(?)
      WHERE json_extract(value,'$.state')='ready' AND NOT EXISTS(SELECT 1 FROM contact_summaries s WHERE s.contact_id=json_extract(value,'$.id') AND s.source_hash=json_extract(value,'$.hash') AND s.model=? AND s.prompt_version=?)
      ON CONFLICT(contact_id,kind) DO UPDATE SET source_hash=excluded.source_hash,version=summary_jobs.version+1,state='pending',attempts=0,due_at=0,error_code=NULL
      WHERE summary_jobs.source_hash IS NOT excluded.source_hash OR summary_jobs.state='done'`
      )
      .bind(json, SUMMARY_MODEL, SUMMARY_PROMPT_VERSION),
    db
      .prepare(
        `UPDATE summary_jobs SET state='done',version=version+1,error_code=NULL WHERE kind='generate' AND contact_id IN
      (SELECT json_extract(value,'$.id') FROM json_each(?) WHERE json_extract(value,'$.state')!='ready'
       OR EXISTS(SELECT 1 FROM contact_summaries s WHERE s.contact_id=json_extract(value,'$.id')
        AND s.source_hash=json_extract(value,'$.hash') AND s.model=? AND s.prompt_version=?)) AND state!='done'`
      )
      .bind(json, SUMMARY_MODEL, SUMMARY_PROMPT_VERSION),
  ]);
}

export function summaryRefreshStatements(
  db: D1Database,
  id: string,
  animalVersion: string | null = null
) {
  const guard = `(? IS NULL OR EXISTS(SELECT 1 FROM contact_animal_overrides WHERE contact_id=? AND version=?))`;
  return [
    db
      .prepare(
        `INSERT INTO summary_jobs(contact_id,kind) SELECT ?,'refresh' WHERE ${guard}
      ON CONFLICT(contact_id,kind) DO UPDATE SET state='pending',attempts=0,due_at=0,error_code=NULL,version=version+1`
      )
      .bind(id, animalVersion, id, animalVersion),
    // Explicit refresh allows recovery after a terminal error, without forcing unchanged successful summaries.
    db
      .prepare(
        `UPDATE summary_jobs SET state='pending',attempts=0,due_at=0,error_code=NULL,version=version+1 WHERE contact_id=? AND kind='generate' AND state='error' AND ${guard}`
      )
      .bind(id, animalVersion, id, animalVersion),
  ];
}

export async function enqueueSummaryRefresh(db: D1Database, id: string) {
  await db.batch(summaryRefreshStatements(db, id));
}

export const unavailableSummary = (): ContactSummaryView => ({
  state: 'unavailable',
  stale: false,
  summary: null,
  sources: null,
  summarySources: null,
  generatedAt: null,
  checkedAt: null,
  model: null,
  generationPaused: true,
});

export async function contactSummary(
  id: string,
  env: Env
): Promise<ContactSummaryView> {
  if (!validContactId(id)) throw new ContactsError(400, 'invalid_contact');
  if (!env.DB) return unavailableSummary();
  if (env.APP_ENVIRONMENT !== 'production') {
    const copy = await env.DB.prepare(
      'SELECT data_version FROM contact_snapshots JOIN preview_state ON active_snapshot=contact_snapshots.id WHERE preview_state.id=1'
    ).first<{ data_version: number }>();
    if (copy?.data_version !== 1) return unavailableSummary();
  }
  const row = await env.DB.prepare(
    `SELECT s.state,s.document,s.source_hash,s.observed_at,
    r.document AS summary,r.sources AS summary_sources,r.source_hash AS summary_hash,r.generated_at,r.model,r.prompt_version,
    g.state AS job_state,g.error_code AS job_error,f.state AS refresh_state,f.error_code AS refresh_error FROM contact_summary_sources s
    LEFT JOIN contact_summaries r ON r.contact_id=s.contact_id
    LEFT JOIN summary_jobs g ON g.contact_id=s.contact_id AND g.kind='generate'
    LEFT JOIN summary_jobs f ON f.contact_id=s.contact_id AND f.kind='refresh' WHERE s.contact_id=?`
  )
    .bind(id)
    .first<{
      state: 'ready' | 'review' | 'insufficient' | 'deleted';
      document: string | null;
      source_hash: string;
      observed_at: string;
      summary: string | null;
      summary_sources: string | null;
      summary_hash: string | null;
      generated_at: string | null;
      model: string | null;
      prompt_version: string | null;
      job_state: string | null;
      job_error: string | null;
      refresh_state: string | null;
      refresh_error: string | null;
    }>();
  const settings = await env.DB.prepare(
    'SELECT mode FROM summary_settings WHERE id=1'
  ).first<{ mode: string }>();
  const generationPaused =
    env.APP_ENVIRONMENT !== 'production' ||
    !env.OPENAI_API_KEY ||
    !['live', 'pilot'].includes(settings?.mode ?? 'paused');
  if (!row) {
    const job = await env.DB.prepare(
      "SELECT state,error_code FROM summary_jobs WHERE contact_id=? AND kind='refresh'"
    )
      .bind(id)
      .first<{ state: string; error_code: string | null }>();
    return {
      ...unavailableSummary(),
      state: job?.error_code
        ? 'error'
        : job?.state === 'pending'
          ? 'pending'
          : job?.state === 'error'
            ? 'error'
            : 'not_generated',
      generationPaused,
    };
  }
  const current =
    row.summary_hash === row.source_hash &&
    row.model === SUMMARY_MODEL &&
    row.prompt_version === SUMMARY_PROMPT_VERSION;
  const state =
    row.state !== 'ready'
      ? row.state
      : row.refresh_error || row.job_error
        ? 'error'
        : row.refresh_state === 'pending' || !current
          ? 'pending'
          : 'ready';
  return {
    state,
    stale: Boolean(row.summary) && (!current || state !== 'ready'),
    summary: row.summary ? JSON.parse(row.summary) : null,
    sources: row.document ? JSON.parse(row.document) : null,
    summarySources: row.summary_sources
      ? JSON.parse(row.summary_sources)
      : null,
    checkedAt: row.observed_at,
    generatedAt: row.generated_at,
    model: row.model,
    generationPaused,
  };
}

export async function requestSummaryRefresh(input: unknown, env: Env) {
  const value = input as { id?: unknown } | null;
  if (!validContactId(value?.id))
    throw new ContactsError(400, 'invalid_contact');
  if (env.APP_ENVIRONMENT !== 'production' || !env.DB)
    throw new ContactsError(503, 'summary_unavailable');
  await enqueueSummaryRefresh(env.DB, value.id);
  return { queued: true };
}
