import { ContactsError } from './contacts.ts';
import type { Env } from './config.ts';
import type { GoogleContact } from './contact-types.ts';
import {
  automaticIdentity,
  validateIdentityCorrection,
} from './contact-identity.ts';

function previewDatabase(env: Env) {
  // Production activation follows operator validation of the preview.
  if (env.APP_ENVIRONMENT !== 'preview' || !env.DB)
    throw new ContactsError(409, 'identity_preview_only');
  return env.DB;
}
export async function identityHistory(id: string, env: Env) {
  const db = previewDatabase(env);
  if (!/^people\/[\w-]+$/.test(id))
    throw new ContactsError(400, 'invalid_identity');
  const rows = await db
    .prepare(
      'SELECT id, action, before_document, after_document, created_at FROM identity_reviews WHERE contact_id = ? ORDER BY rowid DESC LIMIT 20'
    )
    .bind(id)
    .all<{
      id: string;
      action: string;
      before_document: string;
      after_document: string;
      created_at: string;
    }>();
  return {
    history: rows.results.map((row) => ({
      id: row.id,
      action: row.action,
      before: JSON.parse(row.before_document) as GoogleContact,
      after: JSON.parse(row.after_document) as GoogleContact,
      createdAt: row.created_at,
    })),
  };
}
export async function reviewIdentity(input: unknown, env: Env, actor: string) {
  const db = previewDatabase(env);
  const raw = input as {
    action?: string;
    id?: string;
    etag?: string;
    reviewId?: string;
  } | null;
  if (
    !raw ||
    !['apply', 'restore'].includes(raw.action ?? '') ||
    typeof raw.id !== 'string' ||
    !/^people\/[\w-]+$/.test(raw.id) ||
    typeof raw.etag !== 'string' ||
    raw.etag.length > 2048
  )
    throw new ContactsError(400, 'invalid_identity');
  const row = await db
    .prepare(
      'SELECT c.snapshot_id, c.document FROM copied_contacts c JOIN preview_state s ON s.active_snapshot = c.snapshot_id WHERE s.id = 1 AND c.id = ?'
    )
    .bind(raw.id)
    .first<{ snapshot_id: string; document: string }>();
  if (!row) throw new ContactsError(404, 'contact_not_found');
  const before: GoogleContact = JSON.parse(row.document);
  if (before.etag !== raw.etag) throw new ContactsError(409, 'contact_changed');
  const reviewId = crypto.randomUUID();
  let after: GoogleContact;
  if (raw.action === 'apply') {
    let correction;
    try {
      correction = validateIdentityCorrection(input);
    } catch {
      throw new ContactsError(400, 'invalid_identity');
    }
    const existing = new Set(before.identity?.animals.map((a) => a.id) ?? []);
    const animals = correction.animals.map((a) => ({
      ...a,
      id: existing.has(a.id) ? a.id : crypto.randomUUID(),
    }));
    after = {
      ...before,
      givenName: correction.givenName,
      familyName: correction.familyName,
      name: [correction.givenName, correction.familyName]
        .filter(Boolean)
        .join(' '),
      animals: animals.map((a) => a.name),
      identity: {
        originalName: before.identity?.originalName ?? before.name,
        reviewId,
        animals,
      },
      etag: reviewId,
    };
  } else {
    if (typeof raw.reviewId !== 'string')
      throw new ContactsError(400, 'invalid_identity');
    const previous = await db
      .prepare(
        'SELECT before_document, after_document FROM identity_reviews WHERE id = ? AND contact_id = ? AND snapshot_id = ?'
      )
      .bind(raw.reviewId, raw.id, row.snapshot_id)
      .first<{ before_document: string; after_document: string }>();
    if (!previous || JSON.parse(previous.after_document).etag !== before.etag)
      throw new ContactsError(409, 'contact_changed');
    after = { ...JSON.parse(previous.before_document), etag: reviewId };
  }
  // INSERT…SELECT and its trigger are one atomic SQLite/D1 statement. A stale
  // etag, switched snapshot, or import in progress cannot publish any part.
  const result = await db
    .prepare(
      `INSERT INTO identity_reviews(id,contact_id,snapshot_id,actor,action,before_document,after_document)
    SELECT ?,?,?,?,?,?,? FROM copied_contacts c JOIN preview_state s ON s.active_snapshot=c.snapshot_id
    WHERE c.id=? AND c.snapshot_id=? AND c.etag=? AND s.id=1 AND s.import_id IS NULL`
    )
    .bind(
      reviewId,
      raw.id,
      row.snapshot_id,
      actor,
      raw.action,
      row.document,
      JSON.stringify(after),
      raw.id,
      row.snapshot_id,
      raw.etag
    )
    .run();
  if (!result.meta.changes) throw new ContactsError(409, 'contact_changed');
  return { saved: true, reviewId };
}

export async function normalizeIdentities(
  input: unknown,
  env: Env,
  actor: string
) {
  const db = previewDatabase(env);
  const raw = input as { cursor?: string; snapshot?: string } | null;
  if (
    !raw ||
    (raw.cursor !== undefined &&
      (typeof raw.cursor !== 'string' || raw.cursor.length > 200)) ||
    (raw.snapshot !== undefined && typeof raw.snapshot !== 'string')
  )
    throw new ContactsError(400, 'invalid_identity');
  const state = await db
    .prepare('SELECT active_snapshot, import_id FROM preview_state WHERE id=1')
    .first<{ active_snapshot: string; import_id: string | null }>();
  if (!state?.active_snapshot || state.import_id)
    throw new ContactsError(409, 'preview_copy_in_progress');
  if (raw.snapshot && raw.snapshot !== state.active_snapshot)
    throw new ContactsError(409, 'contact_snapshot_changed');
  const rows = await db
    .prepare(
      'SELECT id, document FROM copied_contacts WHERE snapshot_id=? AND id>? ORDER BY id LIMIT 10'
    )
    .bind(state.active_snapshot, raw.cursor ?? '')
    .all<{ id: string; document: string }>();
  let changed = 0;
  let unchanged = 0;
  let skipped = 0;
  for (const row of rows.results) {
    let correction;
    try {
      const contact = JSON.parse(row.document);
      correction = contact.identity ? null : automaticIdentity(contact);
    } catch {
      skipped++;
      continue;
    }
    if (!correction) {
      unchanged++;
      continue;
    }
    await reviewIdentity({ ...correction, action: 'apply' }, env, actor);
    changed++;
  }
  return {
    changed,
    unchanged,
    skipped,
    snapshot: state.active_snapshot,
    cursor: rows.results.at(-1)?.id ?? raw.cursor ?? '',
    done: rows.results.length < 10,
  };
}
