import type { Env } from './config.ts';
import type { ContactPage, LabelPage } from './contact-types.ts';
import { contactsPage, ContactsError } from './contacts.ts';
import { fetchSummarySources } from './contact-summary.ts';
import { nextAppointment, calendarAgenda } from './calendar.ts';
import {
  activateBusinessCopy,
  businessCopyMatches,
  copyBusinessPage,
} from './copy-data.ts';

type CopyState = {
  import_id: string;
  phase: 'contacts' | 'labels' | 'sources' | 'business' | 'calendar';
  cursor: string | null;
  copied: number;
};

// Each call copies one page within D1/Workers request budgets. The operator
// command continues the job; interrupted copies never expose partial data.
export async function copyContactsToPreview(input: unknown, env: Env) {
  if (
    env.APP_ENVIRONMENT !== 'production' ||
    !env.DB ||
    !env.PREVIEW_DB ||
    !env.GOOGLE_CONTACTS
  )
    throw new ContactsError(503, 'preview_copy_unavailable');
  const action = input as { action?: string; id?: string } | null;
  if (
    !action ||
    !['start', 'continue'].includes(action.action ?? '') ||
    (action.action === 'continue' && !/^[a-f0-9-]{36}$/.test(action.id ?? ''))
  )
    throw new ContactsError(400, 'invalid_preview_copy');
  const db = env.PREVIEW_DB;
  const now = Date.now();
  if (action.action === 'start') {
    const id = crypto.randomUUID();
    const [, locked] = await db.batch([
      db
        .prepare(
          'INSERT INTO contact_snapshots (id,data_version) VALUES (?,-1)'
        )
        .bind(id),
      db
        .prepare(
          "UPDATE preview_state SET import_id = ?, import_expires_at = ?, phase = 'contacts', cursor = NULL, copied = 0, busy_id = NULL, busy_expires_at = NULL WHERE id = 1 AND (import_id IS NULL OR (import_expires_at < ? AND COALESCE(busy_expires_at, 0) < ?))"
        )
        .bind(id, now + 15 * 60 * 1000, now, now),
    ]);
    if (locked!.meta.changes !== 1) {
      await db
        .prepare('DELETE FROM contact_snapshots WHERE id = ?')
        .bind(id)
        .run();
      const existing = await db
        .prepare('SELECT import_id, copied FROM preview_state WHERE id = 1')
        .first<CopyState>();
      if (!existing?.import_id)
        throw new ContactsError(409, 'preview_copy_in_progress');
      return { id: existing.import_id, copied: existing.copied, next: true };
    }
    return { id, copied: 0, next: true };
  }
  const id = action.id!;
  const lease = crypto.randomUUID();
  const state = await db
    .prepare(
      'UPDATE preview_state SET busy_id = ?, busy_expires_at = ? WHERE id = 1 AND import_id = ? AND import_expires_at >= ? AND (busy_id IS NULL OR busy_expires_at < ?) RETURNING import_id, phase, cursor, copied'
    )
    .bind(lease, now + 120000, id, now, now)
    .first<CopyState>();
  if (!state) {
    const completed = await db
      .prepare(
        'SELECT copied FROM preview_state WHERE id = 1 AND active_snapshot = ? AND import_id IS NULL'
      )
      .bind(id)
      .first<{ copied: number }>();
    if (completed) return { id, copied: completed.copied, next: false };
    throw new ContactsError(409, 'preview_copy_in_progress');
  }
  try {
    if (state.phase === 'sources' || state.phase === 'business') {
      let cursor: string | null;
      if (state.phase === 'sources') {
        const page = await fetchSummarySources(env, undefined, state.cursor);
        cursor = page.nextPageToken;
        await db
          .prepare(
            `INSERT INTO copied_contact_sources(snapshot_id,contact_id,document)
           SELECT ?,json_extract(value,'$.id'),value FROM json_each(?)
           WHERE EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)
           ON CONFLICT(snapshot_id,contact_id) DO UPDATE SET document=excluded.document`
          )
          .bind(id, JSON.stringify(page.contacts), id, lease)
          .run();
      } else cursor = await copyBusinessPage(env, id, lease, state.cursor);
      const result = await db
        .prepare(
          'UPDATE preview_state SET phase=?,cursor=?,import_expires_at=?,busy_id=NULL,busy_expires_at=NULL WHERE id=1 AND import_id=? AND busy_id=?'
        )
        .bind(
          cursor
            ? state.phase
            : state.phase === 'sources'
              ? 'business'
              : 'calendar',
          cursor,
          Date.now() + 15 * 60 * 1000,
          id,
          lease
        )
        .run();
      if (result.meta.changes !== 1) throw new Error('copy_lease_lost');
      return { id, copied: state.copied, next: true };
    }
    if (state.phase === 'calendar') {
      const missing = await db
        .prepare(
          `SELECT COUNT(*) AS n FROM (
           SELECT c.id FROM copied_contacts c WHERE c.snapshot_id=?
           AND NOT EXISTS(SELECT 1 FROM copied_contact_sources s WHERE s.snapshot_id=c.snapshot_id AND s.contact_id=c.id)
           UNION ALL
           SELECT s.contact_id FROM copied_contact_sources s WHERE s.snapshot_id=?
           AND NOT EXISTS(SELECT 1 FROM copied_contacts c WHERE c.snapshot_id=s.snapshot_id AND c.id=s.contact_id))`
        )
        .bind(id, id)
        .first<{ n: number }>();
      if (missing?.n !== 0) {
        // A contact was added/deleted between the two Google scans. Restart the
        // staging copy rather than publishing contacts with missing sources.
        await db.batch([
          ...[
            'copied_contacts',
            'copied_labels',
            'copied_business_rows',
            'copied_contact_sources',
            'copied_calendar',
          ].map((table) =>
            db
              .prepare(
                `DELETE FROM ${table} WHERE snapshot_id=? AND EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)`
              )
              .bind(id, id, lease)
          ),
          db
            .prepare(
              "UPDATE preview_state SET phase='contacts',cursor=NULL,copied=0,busy_id=NULL,busy_expires_at=NULL,import_expires_at=? WHERE id=1 AND import_id=? AND busy_id=?"
            )
            .bind(Date.now() + 15 * 60 * 1000, id, lease),
        ]);
        return { id, copied: 0, next: true };
      }
      if (!(await businessCopyMatches(env, id))) {
        // A production edit during pagination requires a fresh business read.
        // The previous active copy stays visible until every row matches.
        await db.batch([
          db
            .prepare(
              'DELETE FROM copied_business_rows WHERE snapshot_id=? AND EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)'
            )
            .bind(id, id, lease),
          db
            .prepare(
              "UPDATE preview_state SET phase='business',cursor=NULL,busy_id=NULL,busy_expires_at=NULL WHERE id=1 AND import_id=? AND busy_id=?"
            )
            .bind(id, lease),
        ]);
        return { id, copied: state.copied, next: true };
      }
      const calendar = await nextAppointment(env);
      const today = new Date();
      const from = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), -7)
      )
        .toISOString()
        .slice(0, 10);
      const to = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 16)
      )
        .toISOString()
        .slice(0, 10);
      calendar.agenda =
        calendar.state === 'not_connected'
          ? {
              state: 'not_connected',
              appointments: [],
              from,
              to,
              checkedAt: null,
              demo: false,
            }
          : await calendarAgenda(env, from, to).catch(() => ({
              state: 'unavailable' as const,
              appointments: [],
              from,
              to,
              checkedAt: null,
              demo: false,
            }));
      const result = await db.batch([
        db
          .prepare(
            'INSERT OR REPLACE INTO copied_calendar(snapshot_id,document) SELECT ?,? WHERE EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)'
          )
          .bind(id, JSON.stringify(calendar), id, lease),
        ...activateBusinessCopy(db, id, lease),
        db
          .prepare(
            'UPDATE contact_snapshots SET data_version=1 WHERE id=? AND EXISTS(SELECT 1 FROM preview_state WHERE import_id=? AND busy_id=?)'
          )
          .bind(id, id, lease),
        db
          .prepare(
            'UPDATE preview_state SET active_snapshot=?,import_id=NULL,import_expires_at=NULL,busy_id=NULL,busy_expires_at=NULL WHERE id=1 AND import_id=? AND busy_id=?'
          )
          .bind(id, id, lease),
      ]);
      if (result.at(-1)!.meta.changes !== 1) throw new Error('copy_lease_lost');
      return { id, copied: state.copied, next: false };
    }
    const labels = state.phase === 'labels';
    const url = new URL(
      labels ? '/api/contact-labels' : '/api/contacts',
      env.APP_ORIGIN
    );
    if (state.cursor) url.searchParams.set('pageToken', state.cursor);
    const page = await contactsPage(url, env);
    if (page.nextPageToken && page.nextPageToken === state.cursor)
      throw new Error('repeated_cursor');
    const rows = labels
      ? (page as LabelPage).labels
      : (page as ContactPage).contacts;
    if (!labels && !(page as ContactPage).appointmentsAvailable)
      await db
        .prepare(
          'UPDATE contact_snapshots SET appointments_available = 0 WHERE id = ?'
        )
        .bind(id)
        .run();
    // Notes stay in a separate private source table, never in the contact list.
    for (let offset = 0; offset < rows.length; offset += 100) {
      const sql = labels
        ? `INSERT INTO copied_labels (snapshot_id, id, document) SELECT ?, json_extract(value, '$.id'), value FROM json_each(?) WHERE EXISTS (SELECT 1 FROM preview_state WHERE import_id = ? AND busy_id = ?) ON CONFLICT(snapshot_id, id) DO UPDATE SET document = excluded.document`
        : `INSERT INTO copied_contacts (snapshot_id, id, etag, document) SELECT ?, json_extract(value, '$.id'), json_extract(value, '$.etag'), value FROM json_each(?) WHERE EXISTS (SELECT 1 FROM preview_state WHERE import_id = ? AND busy_id = ?) ON CONFLICT(snapshot_id, id) DO UPDATE SET etag = excluded.etag, document = excluded.document`;
      await db
        .prepare(sql)
        .bind(id, JSON.stringify(rows.slice(offset, offset + 100)), id, lease)
        .run();
    }
    const copied = state.copied + (labels ? 0 : rows.length);
    const result = await db
      .prepare(
        'UPDATE preview_state SET phase = ?, cursor = ?, copied = ?, import_expires_at = ?, busy_id = NULL, busy_expires_at = NULL WHERE id = 1 AND import_id = ? AND busy_id = ?'
      )
      .bind(
        page.nextPageToken === null
          ? labels
            ? 'sources'
            : 'labels'
          : state.phase,
        page.nextPageToken,
        copied,
        Date.now() + 15 * 60 * 1000,
        id,
        lease
      )
      .run();
    if (result.meta.changes !== 1) throw new Error('copy_lease_lost');
    return { id, copied, next: true };
  } catch {
    await db
      .prepare(
        'UPDATE preview_state SET busy_id = NULL, busy_expires_at = NULL WHERE id = 1 AND import_id = ? AND busy_id = ?'
      )
      .bind(id, lease)
      .run();
    throw new ContactsError(503, 'preview_copy_failed');
  }
}
