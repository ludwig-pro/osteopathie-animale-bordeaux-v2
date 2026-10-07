import type { Env } from './config.ts';
import { ContactsError } from './contacts.ts';
import type {
  MailingList,
  MailingListsData,
  SubscriptionStatus,
} from './contact-types.ts';

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
const contactId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^people\/[\w-]+$/.test(value) &&
  value.length <= 200;
const statuses = new Set<SubscriptionStatus>([
  'pending',
  'confirmed',
  'unsubscribed',
]);
function database(env: Env): D1Database {
  if (!env.DB) throw new ContactsError(503, 'lists_configuration_unavailable');
  return env.DB;
}

export async function mailingLists(env: Env): Promise<MailingListsData> {
  const db = database(env);
  const [lists, memberships, archivedLists] = await db.batch([
    db.prepare(
      'SELECT id, name, description FROM mailing_lists WHERE archived_at IS NULL ORDER BY name COLLATE NOCASE'
    ),
    db.prepare(
      'SELECT m.list_id AS listId, m.google_resource_name AS contactId, m.status FROM mailing_list_contacts m JOIN mailing_lists l ON l.id = m.list_id WHERE l.archived_at IS NULL'
    ),
    db.prepare(
      'SELECT id, name, description FROM mailing_lists WHERE archived_at IS NOT NULL ORDER BY name COLLATE NOCASE'
    ),
  ]);
  return {
    lists: lists!.results as unknown as MailingList[],
    archivedLists: archivedLists!.results as unknown as MailingList[],
    memberships: memberships!
      .results as unknown as MailingListsData['memberships'],
  };
}

export async function changeMailingList(
  method: string,
  input: unknown,
  env: Env
): Promise<{ saved: true }> {
  const db = database(env);
  const data = input as {
    id?: unknown;
    name?: unknown;
    description?: unknown;
    restore?: unknown;
  };
  if (
    !data ||
    typeof data !== 'object' ||
    (method !== 'POST' && !validId(data.id))
  )
    throw new ContactsError(400, 'invalid_list');
  if (method === 'DELETE') {
    const result = await db
      .prepare(
        "UPDATE mailing_lists SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND archived_at IS NULL"
      )
      .bind(data.id)
      .run();
    if (!result.meta.changes) throw new ContactsError(404, 'list_not_found');
    return { saved: true };
  }
  if (method === 'PATCH' && data.restore === true) {
    const result = await db
      .prepare(
        "UPDATE mailing_lists SET archived_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND archived_at IS NOT NULL"
      )
      .bind(data.id)
      .run();
    if (!result.meta.changes) throw new ContactsError(404, 'list_not_found');
    return { saved: true };
  }
  if (
    typeof data.name !== 'string' ||
    !data.name.trim() ||
    data.name.trim().length > 80 ||
    /[\x00-\x1f\x7f]/.test(data.name) ||
    typeof data.description !== 'string' ||
    data.description.length > 500
  )
    throw new ContactsError(400, 'invalid_list');
  const name = data.name.trim().normalize('NFC');
  const duplicate = await db
    .prepare(
      'SELECT id FROM mailing_lists WHERE name = ? COLLATE NOCASE AND id != ?'
    )
    .bind(name, method === 'POST' ? '' : data.id)
    .first();
  if (duplicate) throw new ContactsError(409, 'list_name_in_use');
  if (method === 'POST') {
    await db
      .prepare(
        'INSERT INTO mailing_lists(id, name, description) VALUES (?, ?, ?)'
      )
      .bind(crypto.randomUUID(), name, data.description.trim())
      .run();
  } else {
    const result = await db
      .prepare(
        "UPDATE mailing_lists SET name = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND archived_at IS NULL"
      )
      .bind(name, data.description.trim(), data.id)
      .run();
    if (!result.meta.changes) throw new ContactsError(404, 'list_not_found');
  }
  return { saved: true };
}

async function checkLists(db: D1Database, ids: string[]) {
  for (let offset = 0; offset < ids.length; offset += 80) {
    const chunk = ids.slice(offset, offset + 80);
    const result = await db
      .prepare(
        `SELECT id FROM mailing_lists WHERE archived_at IS NULL AND id IN (${chunk.map(() => '?').join(',')})`
      )
      .bind(...chunk)
      .all<{ id: string }>();
    if (result.results.length !== chunk.length)
      throw new ContactsError(409, 'list_not_found');
  }
}

// Bulk assignment is additive and keeps each existing subscription status.
export async function assignLists(
  input: unknown,
  env: Env
): Promise<{ saved: true }> {
  const db = database(env);
  const data = input as { contactIds?: unknown; listIds?: unknown };
  if (
    !Array.isArray(data?.contactIds) ||
    !data.contactIds.length ||
    data.contactIds.length > 100 ||
    !data.contactIds.every(contactId) ||
    !Array.isArray(data.listIds) ||
    !data.listIds.length ||
    data.listIds.length > 20 ||
    !data.listIds.every(validId)
  )
    throw new ContactsError(400, 'invalid_assignment');
  const contacts = [...new Set(data.contactIds)];
  const lists = [...new Set(data.listIds)];
  await checkLists(db, lists);
  const pairs = contacts.flatMap((id) => lists.map((list) => [list, id]));
  const statements = [];
  for (let offset = 0; offset < pairs.length; offset += 50) {
    const chunk = pairs.slice(offset, offset + 50);
    statements.push(
      db
        .prepare(
          `INSERT INTO mailing_list_contacts(list_id, google_resource_name, status) VALUES ${chunk.map(() => "(?, ?, 'pending')").join(',')} ON CONFLICT(list_id, google_resource_name) DO NOTHING`
        )
        .bind(...chunk.flat())
    );
  }
  await db.batch(statements);
  return { saved: true };
}

// Replaces only this contact's explicitly edited memberships, atomically.
export async function replaceContactLists(
  input: unknown,
  env: Env
): Promise<{ saved: true }> {
  const db = database(env);
  const data = input as {
    contactId?: unknown;
    memberships?: { listId: string; status: SubscriptionStatus }[];
  };
  if (
    !contactId(data?.contactId) ||
    !Array.isArray(data.memberships) ||
    data.memberships.length > 200 ||
    !data.memberships.every(
      (item) => validId(item?.listId) && statuses.has(item.status)
    )
  )
    throw new ContactsError(400, 'invalid_assignment');
  const ids = data.memberships.map((item) => item.listId);
  if (new Set(ids).size !== ids.length)
    throw new ContactsError(400, 'invalid_assignment');
  await checkLists(db, ids);
  const statements = [
    db
      .prepare(
        'DELETE FROM mailing_list_contacts WHERE google_resource_name = ?'
      )
      .bind(data.contactId),
  ];
  for (let offset = 0; offset < data.memberships.length; offset += 25) {
    const chunk = data.memberships.slice(offset, offset + 25);
    statements.push(
      db
        .prepare(
          `INSERT INTO mailing_list_contacts(list_id, google_resource_name, status) VALUES ${chunk.map(() => '(?, ?, ?)').join(',')}`
        )
        .bind(
          ...chunk.flatMap((item) => [item.listId, data.contactId, item.status])
        )
    );
  }
  await db.batch(statements);
  return { saved: true };
}
