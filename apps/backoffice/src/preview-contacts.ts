import type { Env } from './config.ts';
import type { GoogleContact } from './contact-types.ts';

export function previewContacts(
  db: D1Database
): NonNullable<Env['GOOGLE_CONTACTS']> {
  return {
    async fetch(request: Request) {
      const url = new URL(request.url);
      const state = await db
        .prepare(
          'SELECT active_snapshot, appointments_available FROM preview_state LEFT JOIN contact_snapshots ON contact_snapshots.id = active_snapshot WHERE preview_state.id = 1'
        )
        .first<{
          active_snapshot: string | null;
          appointments_available: number;
        }>();
      const snapshot = state?.active_snapshot;
      if (request.method === 'GET') {
        const labels = url.pathname === '/labels';
        if (!snapshot)
          return Response.json(
            labels
              ? { labels: [], nextPageToken: null }
              : {
                  contacts: [],
                  nextPageToken: null,
                  appointmentsAvailable: true,
                }
          );
        let after = '';
        const cursor = url.searchParams.get('pageToken');
        if (cursor) {
          try {
            const decoded = JSON.parse(atob(cursor));
            if (
              decoded.snapshot !== snapshot ||
              typeof decoded.after !== 'string'
            )
              throw new Error();
            after = decoded.after;
          } catch {
            return Response.json(
              { error: 'contact_snapshot_changed' },
              { status: 409 }
            );
          }
        }
        const table = labels ? 'copied_labels' : 'copied_contacts';
        const rows = await db
          .prepare(
            `SELECT id, document FROM ${table} WHERE snapshot_id = ? AND id > ? ORDER BY id LIMIT 501`
          )
          .bind(snapshot, after)
          .all<{ id: string; document: string }>();
        const page = rows.results.slice(0, 500);
        const current = await db
          .prepare('SELECT active_snapshot FROM preview_state WHERE id = 1')
          .first<{ active_snapshot: string }>();
        if (current?.active_snapshot !== snapshot)
          return Response.json(
            { error: 'contact_snapshot_changed' },
            { status: 409 }
          );
        const nextPageToken =
          rows.results.length > 500
            ? btoa(JSON.stringify({ snapshot, after: page.at(-1)!.id }))
            : null;
        return Response.json({
          [labels ? 'labels' : 'contacts']: page.map((row) =>
            JSON.parse(row.document)
          ),
          nextPageToken,
          ...(!labels && {
            appointmentsAvailable: state?.appointments_available === 1,
          }),
        });
      }
      if (request.method !== 'PATCH' || url.pathname !== '/contact')
        return Response.json({ error: 'not_found' }, { status: 404 });
      const input = (await request.json()) as Partial<GoogleContact>;
      const text = (value: unknown, max: number): value is string =>
        typeof value === 'string' &&
        value.length <= max &&
        !/[\x00-\x1f\x7f]/.test(value);
      if (
        !input ||
        !text(input.id, 200) ||
        !/^people\/[\w-]+$/.test(input.id) ||
        !text(input.etag, 2048) ||
        !input.etag ||
        !text(input.givenName, 200) ||
        !text(input.familyName, 200) ||
        !Array.isArray(input.emails) ||
        input.emails.length > 20 ||
        !input.emails.every(
          (value) =>
            text(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) ||
        !Array.isArray(input.phones) ||
        input.phones.length > 20 ||
        !input.phones.every(
          (value) =>
            text(value, 64) && /^[+\d().\s-]+$/.test(value) && /\d/.test(value)
        ) ||
        !(
          input.givenName.trim() ||
          input.familyName.trim() ||
          input.emails.length ||
          input.phones.length
        )
      )
        return Response.json({ error: 'invalid_contact' }, { status: 400 });
      if (!snapshot)
        return Response.json({ error: 'contact_not_found' }, { status: 404 });
      const row = await db
        .prepare(
          'SELECT document FROM copied_contacts WHERE snapshot_id = ? AND id = ?'
        )
        .bind(snapshot, input.id)
        .first<{ document: string }>();
      if (!row)
        return Response.json({ error: 'contact_not_found' }, { status: 404 });
      const contact: GoogleContact = JSON.parse(row.document);
      Object.assign(contact, {
        givenName: input.givenName.trim(),
        familyName: input.familyName.trim(),
        emails: input.emails,
        phones: input.phones,
        etag: crypto.randomUUID(),
      });
      contact.name = [contact.givenName, contact.familyName]
        .filter(Boolean)
        .join(' ');
      const result = await db
        .prepare(
          'UPDATE copied_contacts SET etag = ?, document = ? WHERE snapshot_id = ? AND id = ? AND etag = ? AND snapshot_id = (SELECT active_snapshot FROM preview_state WHERE id = 1)'
        )
        .bind(
          contact.etag,
          JSON.stringify(contact),
          snapshot,
          input.id,
          input.etag
        )
        .run();
      return result.meta.changes === 1
        ? Response.json({ saved: true })
        : Response.json({ error: 'contact_changed' }, { status: 409 });
    },
  };
}
