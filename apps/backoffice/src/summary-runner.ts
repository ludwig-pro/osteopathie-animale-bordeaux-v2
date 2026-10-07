import type { Env } from './config.ts';
import {
  fetchSummarySources,
  observeSummarySources,
} from './contact-summary.ts';
import {
  generateSummary,
  SUMMARY_MODEL,
  SUMMARY_PROMPT_VERSION,
  SummaryError,
  type SummaryFetcher,
} from './summary-model.ts';
import type {
  SummaryDossier,
  SummaryJob,
  SummarySettings,
} from './summary-types.ts';

const settings = (db: D1Database) =>
  db
    .prepare('SELECT * FROM summary_settings WHERE id=1')
    .first<SummarySettings>();

async function ownsLease(db: D1Database, owner: string, generation = false) {
  const state = await settings(db);
  return Boolean(
    state &&
    state.lease_owner === owner &&
    state.lease_until > Date.now() &&
    (generation
      ? ['pilot', 'live'].includes(state.mode)
      : state.mode !== 'paused')
  );
}

async function failJob(db: D1Database, job: SummaryJob, error: unknown) {
  const safe =
    error instanceof SummaryError
      ? error
      : new SummaryError('summary_internal_error', true);
  const attempts = job.attempts + 1;
  const terminal = !safe.retryable || attempts >= 5;
  const delay = Math.max(
    60000 * 2 ** Math.min(attempts - 1, 6),
    safe.retryAfter * 1000
  );
  await db
    .prepare(
      `UPDATE summary_jobs SET state=?,attempts=?,due_at=?,error_code=?
    WHERE contact_id=? AND kind=? AND version=?`
    )
    .bind(
      terminal ? 'error' : 'pending',
      attempts,
      Date.now() + delay,
      safe.code,
      job.contact_id,
      job.kind,
      job.version
    )
    .run();
}

async function deleteContact(db: D1Database, id: string) {
  await db.batch([
    db.prepare('DELETE FROM summary_jobs WHERE contact_id=?').bind(id),
    db.prepare('DELETE FROM contact_summaries WHERE contact_id=?').bind(id),
    db
      .prepare(
        `INSERT INTO contact_summary_sources(contact_id,source_hash,state,observed_at) VALUES (?,'','deleted',?)
      ON CONFLICT(contact_id) DO UPDATE SET document=NULL,source_hash='',state='deleted',observed_at=excluded.observed_at`
      )
      .bind(id, new Date().toISOString()),
  ]);
}

async function scanPage(env: Env, db: D1Database, owner: string) {
  let state = (await settings(db))!;
  if (!state.scan_active && state.next_scan > Date.now()) return 0;
  if (state.retry_at > Date.now()) return 0;
  if (!state.scan_active) {
    const generation = crypto.randomUUID();
    await db
      .prepare(
        'UPDATE summary_settings SET scan_active=1,scan_generation=?,scan_cursor=NULL WHERE id=1 AND lease_owner=?'
      )
      .bind(generation, owner)
      .run();
    state = (await settings(db))!;
  }
  try {
    const page = await fetchSummarySources(env, undefined, state.scan_cursor);
    if (!(await ownsLease(db, owner))) return 0;
    await observeSummarySources(db, page.contacts, state.scan_generation);
    if (page.nextPageToken) {
      await db
        .prepare(
          'UPDATE summary_settings SET scan_cursor=?,retry_at=0,last_error=NULL WHERE id=1 AND lease_owner=?'
        )
        .bind(page.nextPageToken, owner)
        .run();
    } else {
      const minutes = Number(env.SUMMARY_REFRESH_MINUTES ?? 60);
      const interval = Number.isFinite(minutes) && minutes >= 5 ? minutes : 60;
      await db.batch([
        // Absence from a completed listing schedules a direct verification, never deletion.
        db
          .prepare(
            `INSERT INTO summary_jobs(contact_id,kind)
          SELECT contact_id,'refresh' FROM contact_summary_sources WHERE state!='deleted' AND scan_generation IS NOT ?
          ON CONFLICT(contact_id,kind) DO UPDATE SET state='pending',attempts=0,due_at=0,error_code=NULL,version=version+1`
          )
          .bind(state.scan_generation),
        db
          .prepare(
            'UPDATE summary_settings SET scan_active=0,scan_cursor=NULL,next_scan=?,retry_at=0,last_error=NULL WHERE id=1 AND lease_owner=?'
          )
          .bind(Date.now() + interval * 60000, owner),
      ]);
    }
    return page.contacts.length;
  } catch {
    await db
      .prepare(
        "UPDATE summary_settings SET retry_at=?,last_error='contact_sources_unavailable' WHERE id=1 AND lease_owner=?"
      )
      .bind(Date.now() + 60000, owner)
      .run();
    return 0;
  }
}

async function processJob(
  env: Env,
  db: D1Database,
  job: SummaryJob,
  owner: string,
  fetcher: SummaryFetcher
): Promise<boolean> {
  try {
    const page = await fetchSummarySources(env, job.contact_id);
    if (!(await ownsLease(db, owner))) return false;
    await observeSummarySources(db, page.contacts);
    if (job.kind === 'refresh') {
      await db
        .prepare(
          "UPDATE summary_jobs SET state='done',error_code=NULL WHERE contact_id=? AND kind='refresh' AND version=?"
        )
        .bind(job.contact_id, job.version)
        .run();
      return false;
    }
    const current = await db
      .prepare(
        "SELECT version,source_hash,state FROM summary_jobs WHERE contact_id=? AND kind='generate'"
      )
      .bind(job.contact_id)
      .first<{ version: number; source_hash: string; state: string }>();
    if (
      current?.version !== job.version ||
      current.state !== 'pending' ||
      current.source_hash !== job.source_hash
    )
      return false;
    const source = await db
      .prepare(
        "SELECT document FROM contact_summary_sources WHERE contact_id=? AND source_hash=? AND state='ready'"
      )
      .bind(job.contact_id, job.source_hash)
      .first<{ document: string }>();
    if (!source || !env.OPENAI_API_KEY || !(await ownsLease(db, owner, true)))
      return false;
    const mode = (await settings(db))!;
    if (mode.mode === 'pilot') {
      await db
        .prepare(
          `INSERT OR IGNORE INTO summary_pilot_contacts(contact_id) SELECT ? WHERE
        (SELECT COUNT(*) FROM summary_pilot_contacts) < (SELECT pilot_limit FROM summary_settings WHERE id=1)`
        )
        .bind(job.contact_id)
        .run();
      if (
        !(await db
          .prepare(
            'SELECT contact_id FROM summary_pilot_contacts WHERE contact_id=?'
          )
          .bind(job.contact_id)
          .first())
      )
        return false;
    }
    // A requested source refresh takes priority and makes an in-flight result obsolete.
    if (
      await db
        .prepare(
          "SELECT 1 FROM summary_jobs WHERE contact_id=? AND kind='refresh' AND state='pending'"
        )
        .bind(job.contact_id)
        .first()
    )
      return false;
    const dossier = JSON.parse(source.document) as SummaryDossier;
    const result = await generateSummary(dossier, env.OPENAI_API_KEY, fetcher);
    if (!(await ownsLease(db, owner, true))) return false;
    // Store only if the same job, sources and operator mode are still current.
    const writes = await db.batch([
      db
        .prepare(
          `INSERT INTO contact_summaries(contact_id,source_hash,document,sources,model,prompt_version,generated_at,input_tokens,output_tokens,duration_ms)
        SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(
          SELECT 1 FROM summary_jobs j JOIN contact_summary_sources s ON s.contact_id=j.contact_id
          JOIN summary_settings t ON t.id=1 WHERE j.contact_id=? AND j.kind='generate' AND j.version=? AND j.state='pending'
          AND j.source_hash=? AND s.source_hash=j.source_hash AND s.state='ready' AND t.lease_owner=? AND t.lease_until>? AND t.mode IN ('pilot','live'))
          AND NOT EXISTS(SELECT 1 FROM summary_jobs WHERE contact_id=? AND kind='refresh' AND state='pending')
        ON CONFLICT(contact_id) DO UPDATE SET source_hash=excluded.source_hash,document=excluded.document,sources=excluded.sources,model=excluded.model,prompt_version=excluded.prompt_version,generated_at=excluded.generated_at,input_tokens=excluded.input_tokens,output_tokens=excluded.output_tokens,duration_ms=excluded.duration_ms`
        )
        .bind(
          job.contact_id,
          job.source_hash,
          JSON.stringify(result.summary),
          source.document,
          SUMMARY_MODEL,
          SUMMARY_PROMPT_VERSION,
          new Date().toISOString(),
          result.inputTokens,
          result.outputTokens,
          result.durationMs,
          job.contact_id,
          job.version,
          job.source_hash,
          owner,
          Date.now(),
          job.contact_id
        ),
      db
        .prepare(
          `UPDATE summary_jobs SET state='done',error_code=NULL WHERE contact_id=? AND kind='generate' AND version=?
        AND EXISTS(SELECT 1 FROM contact_summaries WHERE contact_id=? AND source_hash=? AND model=? AND prompt_version=?)
        AND NOT EXISTS(SELECT 1 FROM summary_jobs WHERE contact_id=? AND kind='refresh' AND state='pending')`
        )
        .bind(
          job.contact_id,
          job.version,
          job.contact_id,
          job.source_hash,
          SUMMARY_MODEL,
          SUMMARY_PROMPT_VERSION,
          job.contact_id
        ),
    ]);
    return writes[0]!.meta.changes > 0;
  } catch (error) {
    if (!(await ownsLease(db, owner))) return false;
    if (error instanceof SummaryError && error.code === 'contact_not_found')
      await deleteContact(db, job.contact_id);
    else await failJob(db, job, error);
    return false;
  }
}

/** Separate from Calendly's runner, with its own durable lease and operator modes. */
export async function runSummaries(
  env: Env,
  fetcher: SummaryFetcher = fetch,
  maxJobs = 5
) {
  const counts = { scanned: 0, processed: 0, generated: 0 };
  if (env.APP_ENVIRONMENT !== 'production' || !env.DB || !env.GOOGLE_CONTACTS)
    return counts;
  const db = env.DB;
  const started = Date.now();
  const owner = crypto.randomUUID();
  const lock = await db
    .prepare(
      "UPDATE summary_settings SET lease_owner=?,lease_until=? WHERE id=1 AND mode!='paused' AND lease_until<=?"
    )
    .bind(owner, started + 120000, started)
    .run();
  if (!lock.meta.changes) return counts;
  try {
    counts.scanned = await scanPage(env, db, owner);
    // Keep D1 queries plus service/model calls below the Free Worker budget.
    // Scanning and pilot reservations cost additional queries.
    const state = (await settings(db))!;
    const batchLimit = counts.scanned > 0 || state.mode === 'pilot' ? 1 : 2;
    for (
      let index = 0;
      index < Math.min(maxJobs, batchLimit) && Date.now() - started < 30000;
      index++
    ) {
      if (!(await ownsLease(db, owner))) break;
      const mode = (await settings(db))!;
      const generate =
        ['pilot', 'live'].includes(mode.mode) && Boolean(env.OPENAI_API_KEY);
      const job = await db
        .prepare(
          `SELECT * FROM summary_jobs WHERE state='pending' AND due_at<=? AND
        (kind='refresh' OR (?=1 AND kind='generate' AND (?!='pilot' OR contact_id IN (SELECT contact_id FROM summary_pilot_contacts) OR
          (SELECT COUNT(*) FROM summary_pilot_contacts) < ?)))
        ORDER BY CASE kind WHEN 'refresh' THEN 0 ELSE 1 END,due_at,contact_id LIMIT 1`
        )
        .bind(Date.now(), generate ? 1 : 0, mode.mode, mode.pilot_limit)
        .first<SummaryJob>();
      if (!job) break;
      const generated = await processJob(env, db, job, owner, fetcher);
      counts.processed++;
      if (generated) counts.generated++;
    }
  } finally {
    await db
      .prepare(
        'UPDATE summary_settings SET lease_owner=NULL,lease_until=0 WHERE id=1 AND lease_owner=?'
      )
      .bind(owner)
      .run();
  }
  return counts;
}
