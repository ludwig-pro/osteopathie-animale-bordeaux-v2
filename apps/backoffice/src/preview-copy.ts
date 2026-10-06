import type { Env } from './config.ts';
import type { ContactPage, LabelPage } from './contact-types.ts';
import { contactsPage, ContactsError } from './contacts.ts';

type CopyState = {
  import_id: string;
  phase: 'contacts' | 'labels';
  cursor: string | null;
  copied: number;
};

// Each call copies one Google page within D1/Workers request budgets. The browser
// continues the job; an interrupted copy is resumed and never exposes partial data.
export async function copyContactsToPreview(input: unknown, env: Env) {
  if (
    env.APP_ENVIRONMENT !== 'production' ||
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
      db.prepare('INSERT INTO contact_snapshots (id) VALUES (?)').bind(id),
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
    // The copied DTO excludes notes and raw Google/Calendly responses.
    for (let offset = 0; offset < rows.length; offset += 100) {
      const sql = labels
        ? `INSERT INTO copied_labels (snapshot_id, id, document) SELECT ?, json_extract(value, '$.id'), value FROM json_each(?) WHERE EXISTS (SELECT 1 FROM preview_state WHERE import_id = ? AND busy_id = ?) ON CONFLICT(snapshot_id, id) DO UPDATE SET document = excluded.document`
        : `INSERT INTO copied_contacts (snapshot_id, id, etag, document) SELECT ?, json_extract(value, '$.id'), json_extract(value, '$.etag'), value FROM json_each(?) WHERE EXISTS (SELECT 1 FROM preview_state WHERE import_id = ? AND busy_id = ?) ON CONFLICT(snapshot_id, id) DO UPDATE SET etag = excluded.etag, document = excluded.document`;
      await db
        .prepare(sql)
        .bind(
          id,
          JSON.stringify(
            rows
              .slice(offset, offset + 100)
              .map((row) =>
                labels ? row : { ...row, etag: `${id}:${row.id}` }
              )
          ),
          id,
          lease
        )
        .run();
    }
    const copied = state.copied + (labels ? 0 : rows.length);
    const done = labels && page.nextPageToken === null;
    const result = done
      ? await db
          .prepare(
            'UPDATE preview_state SET active_snapshot = ?, import_id = NULL, import_expires_at = NULL, busy_id = NULL, busy_expires_at = NULL, copied = ? WHERE id = 1 AND import_id = ? AND busy_id = ?'
          )
          .bind(id, copied, id, lease)
          .run()
      : await db
          .prepare(
            'UPDATE preview_state SET phase = ?, cursor = ?, copied = ?, import_expires_at = ?, busy_id = NULL, busy_expires_at = NULL WHERE id = 1 AND import_id = ? AND busy_id = ?'
          )
          .bind(
            !labels && page.nextPageToken === null ? 'labels' : state.phase,
            page.nextPageToken,
            copied,
            Date.now() + 15 * 60 * 1000,
            id,
            lease
          )
          .run();
    if (result.meta.changes !== 1) throw new Error('copy_lease_lost');
    if (done) {
      // Copy activation is already committed; cleanup failure must not report a failed copy.
      await db
        .prepare(
          "DELETE FROM contact_snapshots WHERE id != (SELECT active_snapshot FROM preview_state WHERE id = 1) AND id != COALESCE((SELECT import_id FROM preview_state WHERE id = 1), '')"
        )
        .run()
        .catch(() => {});
    }
    return { id, copied, next: !done };
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
