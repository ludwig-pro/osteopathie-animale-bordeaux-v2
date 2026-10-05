import { Clients, PERSON_FIELDS, type Page } from './api.ts';
import { SyncError, safeError } from './errors.ts';
import {
  bookingFrom,
  calendlyUri,
  MARKER,
  mergePerson,
  normalizeEmail,
} from './model.ts';
import { enqueue, saveBooking, settings } from './store.ts';
import type {
  Booking,
  Contact,
  Env,
  Fetcher,
  Invitee,
  Job,
  Person,
  ScheduledEvent,
  Settings,
} from './types.ts';

function definitelyRejected(error: unknown): boolean {
  return (
    error instanceof SyncError &&
    (/^google(?:_update)?_http_(400|401|403|404|409|422|429)$/.test(
      error.code
    ) ||
      /^(oauth|google_identity)_/.test(error.code) ||
      error.code === 'google_reauthorize' ||
      error.code === 'google_update_reauthorize' ||
      error.code === 'google_account_mismatch')
  );
}

async function scan(db: D1Database, api: Clients, env: Env, state: Settings) {
  const query = new URLSearchParams({
    user: env.CALENDLY_USER_URI,
    count: '5',
    sort: 'start_time:asc',
  });
  if (state.scan_cursor) query.set('page_token', state.scan_cursor);
  const page = await api.calendly<Page<ScheduledEvent>>(
    `/scheduled_events?${query}`
  );
  const statements: D1PreparedStatement[] = [];
  for (const event of page.collection) {
    calendlyUri(event.uri, 'event');
    statements.push(enqueue(db, 'event', event.uri, { uri: event.uri }));
  }
  const next = page.pagination.next_page_token ?? null;
  statements.push(
    db
      .prepare(
        'UPDATE settings SET scan_cursor=?,scan_active=?,next_scan=? WHERE id=1'
      )
      .bind(next, next ? 1 : 0, Date.now() + 86400000)
  );
  await db.batch(statements);
}
async function indexGoogle(db: D1Database, api: Clients, state: Settings) {
  const generation = state.index_active
    ? state.index_generation!
    : crypto.randomUUID();
  if (!state.index_active)
    await db
      .prepare(
        'UPDATE settings SET index_active=1,index_cursor=NULL,index_generation=? WHERE id=1'
      )
      .bind(generation)
      .run();
  const query = new URLSearchParams({
    personFields: 'emailAddresses,userDefined,metadata',
    pageSize: '100',
    sources: 'READ_SOURCE_TYPE_CONTACT',
  });
  if (state.index_active && state.index_cursor)
    query.set('pageToken', state.index_cursor);
  const page = await api.google<{
    connections?: Person[];
    nextPageToken?: string;
  }>(`/people/me/connections?${query}`);
  const entries = (page.connections ?? []).flatMap((p) => {
    if (!p.resourceName || p.metadata?.deleted) return [];
    const marker = p.userDefined?.find((f) => f.key === MARKER)?.value ?? null;
    // Keep marker-only contacts discoverable after the owner changes their e-mail.
    return (p.emailAddresses?.length ? p.emailAddresses : [{ value: '' }]).map(
      (e) => ({
        resource: p.resourceName,
        email: normalizeEmail(e.value),
        marker,
      })
    );
  });
  const statements = [
    db
      .prepare(
        `INSERT INTO google_index(resource_name,email,marker,generation)
    SELECT json_extract(value,'$.resource'),json_extract(value,'$.email'),json_extract(value,'$.marker'),? FROM json_each(?) WHERE true
    ON CONFLICT(resource_name,email) DO UPDATE SET marker=excluded.marker,generation=excluded.generation`
      )
      .bind(generation, JSON.stringify(entries)),
  ];
  if (page.nextPageToken)
    statements.push(
      db
        .prepare('UPDATE settings SET index_cursor=? WHERE id=1')
        .bind(page.nextPageToken)
    );
  else
    statements.push(
      db
        .prepare('DELETE FROM google_index WHERE generation<>?')
        .bind(generation),
      db
        .prepare(
          'UPDATE settings SET index_active=0,index_cursor=NULL,index_complete=? WHERE id=1'
        )
        .bind(Date.now())
    );
  await db.batch(statements);
}
async function group(
  db: D1Database,
  api: Clients,
  state: Settings,
  assertWrite: () => Promise<void>
) {
  if (state.mode === 'simulate') return 'contactGroups/simulation';
  if (state.google_group) return state.google_group;
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({
      pageSize: '1000',
      groupFields: 'name',
    });
    if (pageToken) query.set('pageToken', pageToken);
    const page = await api.google<{
      contactGroups?: { resourceName: string; name: string }[];
      nextPageToken?: string;
    }>(`/contactGroups?${query}`);
    const match = page.contactGroups?.find((g) => g.name === 'Calendly');
    if (match) {
      await db
        .prepare('UPDATE settings SET google_group=? WHERE id=1')
        .bind(match.resourceName)
        .run();
      return match.resourceName;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  await assertWrite();
  const created = await api.google<{ resourceName: string }>(
    '/contactGroups',
    'POST',
    { contactGroup: { name: 'Calendly' } }
  );
  await db
    .prepare('UPDATE settings SET google_group=? WHERE id=1')
    .bind(created.resourceName)
    .run();
  return created.resourceName;
}
export async function syncContact(
  db: D1Database,
  api: Clients,
  state: Settings,
  email: string,
  assertWrite: () => Promise<void>
) {
  const contact = await db
    .prepare('SELECT * FROM contacts WHERE email=?')
    .bind(email)
    .first<Contact>();
  if (!contact) throw new SyncError('contact_missing');
  const { results } = await db
    .prepare('SELECT data FROM bookings WHERE email=?')
    .bind(email)
    .all<{ data: string }>();
  const bookings = results.map((b) => JSON.parse(b.data) as Booking);
  if (!bookings.length) throw new SyncError('email_changed_review');
  if (state.mode === 'pilot' && !contact.pilot_allowed) {
    const count = await db
      .prepare('SELECT count(*) AS total FROM contacts WHERE pilot_allowed=1')
      .first<{ total: number }>();
    if ((count?.total ?? 0) >= 5)
      throw new SyncError('pilot_limit', true, 3600);
    await db
      .prepare('UPDATE contacts SET pilot_allowed=1 WHERE email=?')
      .bind(email)
      .run();
  }
  let person: Person;
  if (contact.resource_name) person = await api.person(contact.resource_name);
  else {
    const matches = await db
      .prepare(
        'SELECT DISTINCT resource_name FROM google_index WHERE email=? OR marker=?'
      )
      .bind(email, contact.marker)
      .all<{ resource_name: string }>();
    if (matches.results.length > 1)
      throw new SyncError('duplicate_google_contacts');
    const resource = matches.results[0]?.resource_name;
    if (resource) {
      person = await api.person(resource);
      const ownsMarker = person.userDefined?.some(
        (f) => f.key === MARKER && f.value === contact.marker
      );
      if (
        !ownsMarker &&
        !person.emailAddresses?.some((e) => normalizeEmail(e.value) === email)
      )
        throw new SyncError('google_index_stale', true);
      // Reserve the resource before mutation so two Calendly e-mails cannot compete for one Google contact.
      const claimed = await db
        .prepare(
          'SELECT email FROM contacts WHERE resource_name=? AND email<>?'
        )
        .bind(resource, email)
        .first();
      if (claimed) throw new SyncError('google_contact_shared_by_emails');
      await db
        .prepare('UPDATE contacts SET resource_name=? WHERE email=?')
        .bind(resource, email)
        .run();
      contact.resource_name = resource;
    } else {
      if (contact.creation_attempted) throw new SyncError('creation_uncertain');
      person = {};
    }
  }
  // Validate merge before creating even a label during a conflict.
  mergePerson(
    person,
    contact,
    bookings,
    state.google_group ?? 'contactGroups/simulation'
  );
  const label = await group(db, api, state, assertWrite);
  const merged = mergePerson(person, contact, bookings, label);
  if (state.mode === 'simulate') {
    await db
      .prepare('UPDATE contacts SET outcome=? WHERE email=?')
      .bind(contact.resource_name ? 'would_update' : 'would_create', email)
      .run();
    return;
  }
  if (!merged.fields.length) {
    await db
      .prepare(
        "UPDATE contacts SET outcome='unchanged',last_block=?,pending_block=NULL,creation_attempted=0,synced_at=? WHERE email=?"
      )
      .bind(merged.block, Date.now(), email)
      .run();
    return;
  }
  // Persist the intended block BEFORE the API call, allowing a retry after a successful write + lost response.
  await db
    .prepare(
      'UPDATE contacts SET pending_block=?,creation_attempted=CASE WHEN resource_name IS NULL THEN ? ELSE creation_attempted END WHERE email=?'
    )
    .bind(merged.block, Date.now(), email)
    .run();
  await assertWrite();
  let saved: Person;
  const fields = Object.fromEntries(
    merged.fields.map((f) => [f, merged.person[f as keyof Person]])
  );
  if (contact.resource_name) {
    const sources = person.metadata?.sources?.filter(
      (s) => s.type === 'CONTACT'
    );
    if (!sources?.length || !sources[0]?.etag)
      throw new SyncError('google_contact_etag_missing');
    try {
      saved = await api.google<Person>(
        `${api.personPath(contact.resource_name)}:updateContact?updatePersonFields=${merged.fields.join(',')}&personFields=${PERSON_FIELDS}`,
        'PATCH',
        { ...fields, metadata: { sources }, etag: person.etag }
      );
    } catch (error) {
      // A definite rejection means the update did not apply. Do not mistake a first-write
      // etag conflict for manual removal of a block that was never installed.
      if (definitelyRejected(error))
        await db
          .prepare('UPDATE contacts SET pending_block=NULL WHERE email=?')
          .bind(email)
          .run();
      throw error;
    }
  } else {
    try {
      saved = await api.google<Person>(
        `/people:createContact?personFields=${PERSON_FIELDS}`,
        'POST',
        fields
      );
    } catch (error) {
      // A definite refusal (including 429) cannot have created a contact.
      // Timeouts, network errors and 5xx remain uncertain and must use marker recovery.
      if (definitelyRejected(error))
        await db
          .prepare(
            'UPDATE contacts SET pending_block=NULL,creation_attempted=0 WHERE email=?'
          )
          .bind(email)
          .run();
      throw error;
    }
  }
  if (!saved.resourceName) throw new SyncError('google_invalid_response', true);
  const statements = [
    db
      .prepare(
        "UPDATE contacts SET resource_name=?,last_block=?,pending_block=NULL,creation_attempted=0,synced_at=?,outcome='synced' WHERE email=?"
      )
      .bind(saved.resourceName, merged.block, Date.now(), email),
    db
      .prepare(
        'INSERT INTO google_index(resource_name,email,marker,generation) VALUES(?,?,?,?) ON CONFLICT(resource_name,email) DO UPDATE SET marker=excluded.marker,generation=excluded.generation'
      )
      .bind(
        saved.resourceName,
        email,
        contact.marker,
        state.index_generation ?? 'local'
      ),
  ];
  await db.batch(statements);
}
async function processJob(
  db: D1Database,
  api: Clients,
  job: Job,
  state: Settings,
  assertWrite: () => Promise<void>
) {
  const payload = JSON.parse(job.payload) as {
    uri?: string;
    email?: string;
    pageToken?: string;
  };
  if (job.kind === 'invitee') {
    const invitee = await api.invitee(payload.uri!);
    const event = await api.event(invitee.event);
    await saveBooking(db, bookingFrom(invitee, event));
  } else if (job.kind === 'event') {
    const event = await api.event(payload.uri!);
    const query = new URLSearchParams({ count: '5' });
    if (payload.pageToken) query.set('page_token', payload.pageToken);
    const page = await api.calendly<Page<Invitee>>(
      `${new URL(event.uri).pathname}/invitees?${query}`
    );
    for (const invitee of page.collection)
      await saveBooking(db, bookingFrom(invitee, event));
    if (page.pagination.next_page_token)
      await enqueue(db, 'event', event.uri, {
        uri: event.uri,
        pageToken: page.pagination.next_page_token,
      }).run();
  } else await syncContact(db, api, state, payload.email!, assertWrite);
  await db
    .prepare(
      "UPDATE jobs SET state='done',error_code=NULL,attempts=0 WHERE id=? AND version=?"
    )
    .bind(job.id, job.version)
    .run();
}
export async function run(env: Env, fetcher: Fetcher = fetch): Promise<void> {
  const db = env.DB;
  const initial = await settings(db);
  if (initial.mode === 'paused' || initial.retry_at > Date.now()) return;
  const owner = crypto.randomUUID(),
    started = Date.now();
  const acquired = await db
    .prepare(
      'UPDATE settings SET lease_owner=?,lease_until=? WHERE id=1 AND lease_until<?'
    )
    .bind(owner, started + 120000, started)
    .run();
  if (!acquired.meta.changes) return;
  let job: Job | null = null;
  try {
    const state = await settings(db);
    if (state.mode === 'paused') return;
    const api = new Clients(env, fetcher);
    const assertWrite = async () => {
      if (Date.now() - started > 45000)
        throw new SyncError('execution_deadline', true);
      const current = await db
        .prepare(
          "SELECT id FROM settings WHERE id=1 AND lease_owner=? AND lease_until>? AND mode=? AND mode IN ('pilot','live')"
        )
        .bind(owner, Date.now() + 15000, state.mode)
        .first();
      if (!current) throw new SyncError('writes_paused', true);
    };
    await db.prepare('UPDATE settings SET turn=turn+1 WHERE id=1').run();
    const priority = await db
      .prepare(
        "SELECT * FROM jobs WHERE state='pending' AND kind='invitee' AND due_at<=? ORDER BY id LIMIT 1"
      )
      .bind(Date.now())
      .first<Job>();
    if (
      !priority &&
      (state.scan_active || state.next_scan <= Date.now()) &&
      state.turn % 2 === 0
    ) {
      if (!state.scan_active)
        await db
          .prepare(
            'UPDATE settings SET scan_active=1,scan_cursor=NULL WHERE id=1'
          )
          .run();
      await scan(db, api, env, {
        ...state,
        scan_cursor: state.scan_active ? state.scan_cursor : null,
      });
      return;
    }
    job =
      priority ??
      (await db
        .prepare(
          "SELECT * FROM jobs WHERE state='pending' AND due_at<=? ORDER BY CASE WHEN kind=? THEN 0 ELSE 1 END,id LIMIT 1"
        )
        .bind(Date.now(), state.turn % 3 === 0 ? 'contact' : 'event')
        .first<Job>());
    if (!job) return;
    if (job.kind === 'contact') {
      const pendingCreation = await db
        .prepare(
          'SELECT max(creation_attempted) AS latest FROM contacts WHERE resource_name IS NULL'
        )
        .first<{ latest: number | null }>();
      if (
        state.index_active ||
        !state.index_complete ||
        Date.now() - state.index_complete > 300000 ||
        (pendingCreation?.latest ?? 0) >= state.index_complete
      ) {
        // This is infrastructure work, not a failed contact attempt.
        job = null;
        await indexGoogle(db, api, state);
        return;
      }
    }
    await processJob(db, api, job, state, assertWrite);
    await db
      .prepare(
        'UPDATE settings SET last_success=?,last_error=NULL,retry_at=0 WHERE id=1'
      )
      .bind(Date.now())
      .run();
  } catch (error) {
    const safe = safeError(error);
    if (job) {
      const attempts = job.attempts + 1;
      const special = [
        'pilot_limit',
        'writes_paused',
        'execution_deadline',
      ].includes(safe.code);
      const retry = safe.retryable && (attempts < 8 || special);
      await db
        .prepare(
          'UPDATE jobs SET state=?,attempts=?,due_at=?,error_code=? WHERE id=? AND version=?'
        )
        .bind(
          retry ? 'pending' : 'conflict',
          special ? job.attempts : attempts,
          Date.now() +
            1000 *
              Math.max(safe.retryAfter, Math.min(21600, 30 * 2 ** attempts)),
          safe.code,
          job.id,
          job.version
        )
        .run();
    }
    await db
      .prepare('UPDATE settings SET last_error=?,retry_at=? WHERE id=1')
      .bind(
        safe.code,
        job
          ? 0
          : Date.now() +
              1000 * Math.max(safe.retryAfter, safe.retryable ? 60 : 3600)
      )
      .run();
  } finally {
    await db
      .prepare(
        'UPDATE settings SET lease_owner=NULL,lease_until=0 WHERE id=1 AND lease_owner=?'
      )
      .bind(owner)
      .run();
  }
}
