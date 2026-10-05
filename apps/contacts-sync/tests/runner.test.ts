import test from 'node:test';
import assert from 'node:assert/strict';
import { database, environment, upstream, booking } from './helpers.ts';
import { saveBooking, enqueue } from '../src/store.ts';
import { run } from '../src/runner.ts';
import { MARKER } from '../src/model.ts';

function setup(mode = 'simulate') {
  const local = database();
  local.sqlite
    .prepare('UPDATE settings SET mode=?,next_scan=?')
    .run(mode, Date.now() + 86400000);
  const remote = upstream(),
    env = environment(local.db);
  const tick = () => run(env, remote.fetcher);
  const retry = () =>
    local.sqlite.exec("UPDATE jobs SET due_at=0 WHERE state='pending'");
  return { ...local, ...remote, env, tick, retry };
}
test('simulation inventories existing contacts and predicts changes without any Google mutation', async () => {
  const t = setup();
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  assert.equal(
    t.sqlite.prepare('SELECT outcome FROM contacts').get()!.outcome,
    'would_create'
  );
  assert.equal(
    t.calls.filter(
      (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
    ).length,
    0
  );
});
test('creates a single contact, retries identical bookings without writing, and preserves cancellation', async () => {
  const t = setup('live');
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  assert.equal(t.people.size, 1);
  assert.equal(t.behavior.createCalls, 1);
  await saveBooking(t.db, booking());
  await t.tick();
  assert.equal(t.behavior.createCalls, 1);
  await saveBooking(
    t.db,
    booking('invitee-1', {
      status: 'canceled',
      updatedAt: '2025-02-01T00:00:00Z',
    })
  );
  await t.tick();
  assert.match([...t.people.values()][0]!.biographies![0]!.value, /Annulé/);
  await saveBooking(t.db, booking());
  await t.tick();
  assert.match([...t.people.values()][0]!.biographies![0]!.value, /Annulé/);
});
test('existing Google contact keeps manual name and notes when adding a second animal', async () => {
  const t = setup('live');
  t.people.set('people/manual', {
    resourceName: 'people/manual',
    emailAddresses: [{ value: 'person@example.com' }],
    names: [{ givenName: 'Manuel' }],
    biographies: [{ value: 'À préserver' }],
    metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
  });
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  await saveBooking(
    t.db,
    booking('two', { animal: 'Moka', start: '2025-02-03T10:00:00Z' })
  );
  await t.tick();
  const p = t.people.get('people/manual')!;
  assert.equal(p.names![0]!.givenName, 'Manuel');
  assert.match(p.biographies![0]!.value, /^À préserver/);
  assert.match(p.biographies![0]!.value, /Oslo/);
  assert.match(p.biographies![0]!.value, /Moka/);
  assert.equal(t.behavior.createCalls, 0);
});
test('ambiguous contacts are reported without mutation', async () => {
  const t = setup('live');
  for (const id of ['one', 'two'])
    t.people.set(`people/${id}`, {
      resourceName: `people/${id}`,
      emailAddresses: [{ value: 'person@example.com' }],
    });
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  assert.equal(
    t.sqlite.prepare("SELECT error_code FROM jobs WHERE kind='contact'").get()!
      .error_code,
    'duplicate_google_contacts'
  );
  assert.equal(
    t.calls.filter(
      (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
    ).length,
    0
  );
});
test('lost create response is recovered by marker after refreshing the index, without second POST', async () => {
  const t = setup('live');
  t.behavior.lostCreate = true;
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  assert.equal(t.behavior.createCalls, 1);
  t.retry();
  // Ensure an index snapshot after the attempt, even on same-millisecond fake responses.
  await new Promise((resolve) => setTimeout(resolve, 5));
  t.sqlite.exec('UPDATE settings SET index_complete=0');
  await t.tick();
  await t.tick();
  assert.equal(t.behavior.createCalls, 1);
  assert.equal(t.people.size, 1);
  assert.equal(
    t.sqlite.prepare('SELECT resource_name FROM contacts').get()!.resource_name,
    'people/1'
  );
  assert.equal(
    t.sqlite.prepare('SELECT creation_attempted FROM contacts').get()!
      .creation_attempted,
    0
  );
});
test('uncertain create never retries creation just because an index does not find the result', async () => {
  const t = setup('live');
  await saveBooking(t.db, booking());
  await t.tick();
  t.sqlite
    .prepare('UPDATE contacts SET creation_attempted=?')
    .run(Date.now() - 5000);
  await t.tick();
  assert.equal(t.behavior.createCalls, 0);
  assert.equal(
    t.sqlite.prepare("SELECT error_code FROM jobs WHERE kind='contact'").get()!
      .error_code,
    'creation_uncertain'
  );
});
test('deleted mapped Google contact is not recreated', async () => {
  const t = setup('live');
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  t.people.clear();
  await saveBooking(t.db, booking('two'));
  await t.tick();
  assert.equal(t.behavior.createCalls, 1);
  assert.equal(
    t.sqlite.prepare("SELECT error_code FROM jobs WHERE kind='contact'").get()!
      .error_code,
    'google_contact_deleted'
  );
});
test('manual managed-note changes become a conflict', async () => {
  const t = setup('live');
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  const p = [...t.people.values()][0]!;
  p.biographies![0]!.value = p.biographies![0]!.value.replace('Oslo', 'Manuel');
  await saveBooking(t.db, booking('two'));
  await t.tick();
  assert.equal(
    t.sqlite.prepare("SELECT error_code FROM jobs WHERE kind='contact'").get()!
      .error_code,
    'notes_manually_modified'
  );
  assert.match(p.biographies![0]!.value, /Manuel/);
});
test('pilot admits at most five distinct contacts across invocations', async () => {
  const t = setup('pilot');
  for (let i = 0; i < 7; i++)
    await saveBooking(
      t.db,
      booking(`i-${i}`, { email: `person${i}@example.com` })
    );
  for (let i = 0; i < 10; i++) await t.tick();
  assert.equal(t.people.size, 5);
  assert.equal(
    t.sqlite
      .prepare('SELECT count(*) n FROM contacts WHERE pilot_allowed=1')
      .get()!.n,
    5
  );
});
test('pause and concurrent lease prevent work, including Google token refresh', async () => {
  const t = setup('paused');
  await saveBooking(t.db, booking());
  await t.tick();
  assert.equal(t.calls.length, 0);
  t.sqlite
    .prepare(
      "UPDATE settings SET mode='live',lease_owner='other',lease_until=?"
    )
    .run(Date.now() + 10000);
  await t.tick();
  assert.equal(t.calls.length, 0);
});
test('wrong Google account and revoked token cannot write contacts, errors contain no personal details', async () => {
  for (const behavior of ['wrongAccount', 'reauthorize'] as const) {
    const t = setup('live');
    t.behavior[behavior] = true;
    await saveBooking(t.db, booking());
    await t.tick();
    assert.equal(t.people.size, 0);
    const error = t.sqlite.prepare('SELECT last_error FROM settings').get()!
      .last_error;
    assert.match(String(error), /google_account_mismatch|oauth_reauthorize/);
    assert.doesNotMatch(String(error), /@|fake/);
  }
});
test('Google 429 backs off without creating contacts', async () => {
  const t = setup('live');
  await saveBooking(t.db, booking());
  await t.tick();
  t.behavior.rateLimited = true;
  await t.tick();
  assert.equal(t.people.size, 0);
  const job = t.sqlite.prepare('SELECT due_at,state FROM jobs').get()!;
  assert.equal(job.state, 'pending');
  assert.ok(Number(job.due_at) > Date.now() + 100000);
});
test('event and invitee pagination resumes and reconciles cancellation authoritatively', async () => {
  const t = setup();
  t.sqlite.exec('UPDATE settings SET next_scan=0');
  for (let i = 0; i < 101; i++) {
    const uri = `https://api.calendly.com/scheduled_events/event-${i}`;
    t.events.set(uri, {
      uri,
      start_time: '2025-01-01T10:00:00Z',
      status: 'active',
      updated_at: '2025-01-01T00:00:00Z',
      event_memberships: [{ user: t.env.CALENDLY_USER_URI }],
    });
    for (let j = 0; j < (i === 0 ? 6 : 1); j++) {
      const inviteeUri = `${uri}/invitees/invitee-${i}-${j}`;
      t.invitees.set(inviteeUri, {
        uri: inviteeUri,
        event: uri,
        email: `person${i}-${j}@example.com`,
        name: 'Exemple',
        status: 'active',
        updated_at: '2025-01-01T00:00:00Z',
      });
    }
  }
  await t.tick();
  assert.equal(
    t.sqlite.prepare('SELECT scan_cursor FROM settings').get()!.scan_cursor,
    '100'
  );
  for (let i = 0; i < 350; i++) await t.tick();
  assert.equal(
    t.sqlite.prepare('SELECT count(*) n FROM bookings').get()!.n,
    106
  );
  const invitee = [...t.invitees.values()][0]!;
  invitee.status = 'canceled';
  invitee.updated_at = '2025-02-01T00:00:00Z';
  await enqueue(t.db, 'invitee', invitee.uri, { uri: invitee.uri }).run();
  await t.tick();
  assert.match(
    String(
      t.sqlite
        .prepare('SELECT data FROM bookings WHERE uri=?')
        .get(invitee.uri)!.data
    ),
    /"status":"canceled"/
  );
});
test('fresh read and retry after Google etag conflict preserve a newly added manual note', async () => {
  const t = setup('live');
  t.people.set('people/manual', {
    resourceName: 'people/manual',
    emailAddresses: [{ value: 'person@example.com' }],
    metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
  });
  await saveBooking(t.db, booking());
  await t.tick();
  t.behavior.updateConflict = true;
  await t.tick();
  t.retry();
  await t.tick();
  const p = t.people.get('people/manual')!;
  assert.match(p.biographies![0]!.value, /^Nouvelle note manuelle/);
  assert.ok(p.userDefined?.some((f) => f.key === MARKER));
});

test('rescheduled bookings keep both animals and the cancellation link', async () => {
  const t = setup('live');
  const replacement =
    'https://api.calendly.com/scheduled_events/event-1/invitees/new';
  await saveBooking(
    t.db,
    booking('old', { status: 'canceled', newInvitee: replacement })
  );
  await saveBooking(
    t.db,
    booking('new', {
      oldInvitee: booking('old').uri,
      animal: 'Moka',
      start: '2025-02-01T10:00:00Z',
    })
  );
  await t.tick();
  await t.tick();
  const notes = [...t.people.values()][0]!.biographies![0]!.value;
  assert.match(notes, /Oslo/);
  assert.match(notes, /Moka/);
  assert.match(notes, /Annulé/);
  assert.match(notes, /Report d’un rendez-vous/);
  assert.equal(t.people.size, 1);
});
test('daily reconciliation recovers changed invitees even when event revision is unchanged', async () => {
  const t = setup();
  const original = booking();
  t.events.set(original.eventUri, {
    uri: original.eventUri,
    start_time: original.start,
    status: 'active',
    updated_at: original.updatedAt,
    event_memberships: [{ user: t.env.CALENDLY_USER_URI }],
  });
  t.invitees.set(original.uri, {
    uri: original.uri,
    event: original.eventUri,
    email: original.email,
    name: original.name,
    status: 'active',
    updated_at: original.updatedAt,
  });
  t.sqlite.exec('UPDATE settings SET next_scan=0');
  for (let i = 0; i < 8; i++) await t.tick();
  t.invitees.get(original.uri)!.status = 'canceled';
  t.invitees.get(original.uri)!.updated_at = '2025-03-01T00:00:00Z';
  t.sqlite.exec('UPDATE settings SET next_scan=0');
  for (let i = 0; i < 8; i++) await t.tick();
  assert.match(
    String(t.sqlite.prepare('SELECT data FROM bookings').get()!.data),
    /"status":"canceled"/
  );
});
test('a webhook arriving during an invitee read remains pending after that read completes', async () => {
  const t = setup();
  const original = booking();
  t.events.set(original.eventUri, {
    uri: original.eventUri,
    start_time: original.start,
    status: 'active',
    updated_at: original.updatedAt,
    event_memberships: [{ user: t.env.CALENDLY_USER_URI }],
  });
  t.invitees.set(original.uri, {
    uri: original.uri,
    event: original.eventUri,
    email: original.email,
    name: original.name,
    status: 'active',
    updated_at: original.updatedAt,
  });
  await enqueue(t.db, 'invitee', original.uri, { uri: original.uri }).run();
  await run(t.env, async (url, init) => {
    const response = await t.fetcher(url, init);
    if (url === original.uri)
      await enqueue(t.db, 'invitee', original.uri, { uri: original.uri }).run();
    return response;
  });
  assert.equal(
    t.sqlite.prepare("SELECT state FROM jobs WHERE kind='invitee'").get()!
      .state,
    'pending'
  );
  await t.tick();
  assert.equal(
    t.sqlite.prepare("SELECT state FROM jobs WHERE kind='invitee'").get()!
      .state,
    'done'
  );
});
test('pause or lease loss during a contact read prevents the following write', async () => {
  for (const mutation of [
    "UPDATE settings SET mode='paused'",
    'UPDATE settings SET lease_until=0',
  ]) {
    const t = setup('live');
    t.people.set('people/manual', {
      resourceName: 'people/manual',
      emailAddresses: [{ value: 'person@example.com' }],
      metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
    });
    await saveBooking(t.db, booking());
    await t.tick();
    await run(t.env, async (url, init) => {
      const response = await t.fetcher(url, init);
      if (new URL(url).pathname === '/v1/people/manual')
        t.sqlite.exec(mutation);
      return response;
    });
    assert.equal(
      t.calls.filter(
        (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
      ).length,
      0
    );
  }
});
test('a previous interrupted invocation resumes only when its durable lease expires', async () => {
  const t = setup('live');
  await saveBooking(t.db, booking());
  t.sqlite
    .prepare("UPDATE settings SET lease_owner='interrupted',lease_until=?")
    .run(Date.now() + 120000);
  await t.tick();
  assert.equal(t.calls.length, 0);
  t.sqlite.exec('UPDATE settings SET lease_until=0');
  await t.tick();
  await t.tick();
  assert.equal(t.people.size, 1);
});
test('Google contact index resumes more than one page without creating an existing contact', async () => {
  const t = setup('live');
  for (let i = 0; i < 1001; i++)
    t.people.set(`people/p${i}`, {
      resourceName: `people/p${i}`,
      emailAddresses: [
        { value: i === 1000 ? 'person@example.com' : `other${i}@example.com` },
      ],
      metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
    });
  await saveBooking(t.db, booking());
  await t.tick();
  assert.equal(
    t.sqlite.prepare('SELECT index_cursor FROM settings').get()!.index_cursor,
    '1000'
  );
  await t.tick();
  await t.tick();
  assert.equal(t.behavior.createCalls, 0);
  assert.equal(
    t.sqlite.prepare('SELECT resource_name FROM contacts').get()!.resource_name,
    'people/p1000'
  );
});

test('a definite 429 refusal to create is retried without an uncertain-creation conflict', async () => {
  const t = setup('live');
  t.behavior.rejectCreateOnce = true;
  await saveBooking(t.db, booking());
  await t.tick();
  await t.tick();
  assert.equal(t.people.size, 0);
  assert.equal(
    t.sqlite.prepare('SELECT creation_attempted FROM contacts').get()!
      .creation_attempted,
    0
  );
  t.retry();
  await t.tick();
  assert.equal(t.people.size, 1);
  assert.equal(t.behavior.createCalls, 2);
});
