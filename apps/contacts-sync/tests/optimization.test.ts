import test from 'node:test';
import assert from 'node:assert/strict';
import { database, environment, upstream, booking } from './helpers.ts';
import { saveBooking, enqueue } from '../src/store.ts';
import { run } from '../src/runner.ts';
import type { Fetcher } from '../src/types.ts';

function setup() {
  const t = database();
  t.sqlite
    .prepare("UPDATE settings SET mode='live',next_scan=?")
    .run(Date.now() + 86400000);
  return { ...t, ...upstream(), env: environment(t.db) };
}

test('one batch shares Google authentication, bounds requests and keeps writes sequential', async () => {
  const t = setup();
  for (let n = 0; n < 50; n++)
    await saveBooking(
      t.db,
      booking(`batch-${n}`, { email: `fake-${n}@example.test` })
    );
  let writing = 0,
    maximum = 0;
  const fetcher: Fetcher = async (url, init) => {
    const mutation =
      new URL(url).hostname === 'people.googleapis.com' &&
      init?.method !== 'GET';
    if (mutation) maximum = Math.max(maximum, ++writing);
    try {
      await Promise.resolve();
      return await t.fetcher(url, init);
    } finally {
      if (mutation) writing--;
    }
  };
  await run(t.env, fetcher, 30);
  assert.ok(t.behavior.createCalls >= 10);
  assert.ok(t.calls.length <= 45);
  assert.equal(maximum, 1);
  assert.equal(
    t.calls.filter((c) => c.url.hostname === 'oauth2.googleapis.com').length,
    1
  );
  assert.equal(
    t.calls.filter((c) => c.url.hostname === 'openidconnect.googleapis.com')
      .length,
    1
  );
  assert.equal(
    t.sqlite.prepare('SELECT lease_until FROM settings').get()!.lease_until,
    0
  );
  assert.ok(
    Number(
      t.sqlite
        .prepare("SELECT count(*) n FROM jobs WHERE state='pending'")
        .get()!.n
    ) > 0
  );
});

test('parallel Calendly reads share one account check and finish before saving the event', async () => {
  const t = setup(),
    original = booking();
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
  await enqueue(t.db, 'event', original.eventUri, {
    uri: original.eventUri,
  }).run();
  let active = 0,
    peak = 0;
  await run(
    t.env,
    async (url, init) => {
      const read = new URL(url).pathname.startsWith('/scheduled_events/');
      if (read) peak = Math.max(peak, ++active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 2));
        return await t.fetcher(url, init);
      } finally {
        if (read) active--;
      }
    },
    30
  );
  assert.equal(peak, 2);
  assert.equal(active, 0);
  assert.equal(t.calls.filter((c) => c.url.pathname === '/users/me').length, 1);
  assert.equal(t.sqlite.prepare('SELECT count(*) n FROM bookings').get()!.n, 1);
});

test('pause during a batch prevents the next write and the same lease excludes other runners', async () => {
  const t = setup();
  for (let n = 0; n < 3; n++)
    await saveBooking(
      t.db,
      booking(`pause-${n}`, { email: `fake-${n}@example.test` })
    );
  await run(
    t.env,
    async (url, init) => {
      const response = await t.fetcher(url, init);
      if (new URL(url).pathname === '/v1/people:createContact') {
        const before = t.calls.length;
        await run(t.env, t.fetcher, 30);
        assert.equal(t.calls.length, before);
        t.sqlite.exec("UPDATE settings SET mode='paused'");
      }
      return response;
    },
    30
  );
  assert.equal(t.behavior.createCalls, 1);
  assert.equal(
    t.sqlite.prepare("SELECT count(*) n FROM jobs WHERE state='pending'").get()!
      .n,
    2
  );
});

test('mapped contacts use fresh person reads without rebuilding an old or active index', async () => {
  const t = setup();
  await saveBooking(t.db, booking());
  await run(t.env, t.fetcher, 30);
  const before = t.calls.filter((c) =>
    c.url.pathname.endsWith('/connections')
  ).length;
  t.sqlite.exec('UPDATE settings SET index_complete=0,index_active=1');
  await saveBooking(t.db, booking('second-animal', { animal: 'Moka' }));
  await run(t.env, t.fetcher, 30);
  assert.equal(
    t.calls.filter((c) => c.url.pathname.endsWith('/connections')).length,
    before
  );
  assert.equal(t.behavior.createCalls, 1);
  assert.match(
    [...t.people.values()][0]!.biographies![0]!.value,
    /Oslo[\s\S]*Moka/
  );
});

test('incremental index resumes pagination, removes deleted/old emails and retains untouched contacts', async () => {
  const t = setup();
  for (const id of ['changed', 'deleted', 'untouched'])
    t.people.set(`people/${id}`, {
      resourceName: `people/${id}`,
      emailAddresses: [{ value: `${id}@example.test` }],
    });
  await saveBooking(t.db, booking());
  await run(t.env, t.fetcher); // initial full inventory only
  const token = t.sqlite
    .prepare('SELECT google_sync_token FROM settings')
    .get()!.google_sync_token;
  assert.equal(token, 'test-sync-token');
  t.sqlite.exec('UPDATE settings SET index_complete=0');
  let pages = 0;
  const delta: Fetcher = async (input, init) => {
    const url = new URL(input);
    if (!url.pathname.endsWith('/connections')) return t.fetcher(input, init);
    assert.equal(url.searchParams.get('syncToken'), token);
    assert.equal(url.searchParams.get('requestSyncToken'), 'true');
    assert.equal(url.searchParams.get('pageSize'), '1000');
    pages++;
    if (!url.searchParams.has('pageToken'))
      return Response.json({
        connections: [
          {
            resourceName: 'people/changed',
            emailAddresses: [{ value: 'new@example.test' }],
          },
          { resourceName: 'people/deleted', metadata: { deleted: true } },
        ],
        nextPageToken: 'delta-page-2',
      });
    assert.equal(url.searchParams.get('pageToken'), 'delta-page-2');
    return Response.json({ connections: [], nextSyncToken: 'next-sync-token' });
  };
  await run(t.env, delta);
  assert.equal(
    t.sqlite.prepare('SELECT google_sync_token FROM settings').get()!
      .google_sync_token,
    token
  );
  assert.equal(
    t.sqlite.prepare('SELECT index_active FROM settings').get()!.index_active,
    1
  );
  await run(t.env, delta); // a separate invocation must resume the same cursor/parameters
  assert.equal(pages, 2);
  assert.deepEqual(
    t.sqlite
      .prepare('SELECT email FROM google_index ORDER BY email')
      .all()
      .map((r) => r.email),
    ['new@example.test', 'untouched@example.test']
  );
  assert.equal(
    t.sqlite.prepare('SELECT google_sync_token FROM settings').get()!
      .google_sync_token,
    'next-sync-token'
  );
  assert.equal(
    t.sqlite.prepare('SELECT index_active FROM settings').get()!.index_active,
    0
  );
});

test('an expired Google sync token restarts a full inventory before resolving an unknown contact', async () => {
  const t = setup();
  await saveBooking(t.db, booking());
  await run(t.env, t.fetcher);
  t.sqlite.exec('UPDATE settings SET index_complete=0');
  await run(t.env, async (input, init) =>
    new URL(input).searchParams.has('syncToken')
      ? Response.json({}, { status: 410 })
      : t.fetcher(input, init)
  );
  const state = t.sqlite
    .prepare(
      'SELECT google_sync_token,index_active,index_complete FROM settings'
    )
    .get()!;
  assert.equal(state.google_sync_token, null);
  assert.equal(state.index_active, 0);
  assert.equal(state.index_complete, 0);
  assert.equal(t.behavior.createCalls, 0);
  await run(t.env, t.fetcher);
  assert.equal(
    t.calls
      .filter((c) => c.url.pathname.endsWith('/connections'))
      .at(-1)!
      .url.searchParams.has('syncToken'),
    false
  );
  await run(t.env, t.fetcher);
  assert.equal(t.behavior.createCalls, 1);
});

test('an empty incremental response after an uncertain creation cannot trigger a second create', async () => {
  const t = setup();
  t.behavior.lostCreate = true;
  await saveBooking(t.db, booking());
  await run(t.env, t.fetcher, 30);
  assert.equal(t.behavior.createCalls, 1);
  t.sqlite.exec(
    'UPDATE jobs SET due_at=0; UPDATE settings SET index_complete=0'
  );
  await run(
    t.env,
    async (input, init) => {
      if (new URL(input).searchParams.has('syncToken'))
        return Response.json({
          connections: [],
          nextSyncToken: 'delayed-sync',
        });
      return t.fetcher(input, init);
    },
    30
  );
  assert.equal(t.behavior.createCalls, 1);
  assert.equal(t.people.size, 1);
  assert.equal(
    t.sqlite.prepare("SELECT error_code FROM jobs WHERE kind='contact'").get()!
      .error_code,
    'creation_uncertain'
  );
});

test('a pause after recording the intended notes restores the prior intent before retry', async () => {
  const t = setup();
  t.sqlite.exec("UPDATE settings SET google_group='contactGroups/calendly'");
  t.people.set('people/manual', {
    resourceName: 'people/manual',
    emailAddresses: [{ value: 'person@example.com' }],
    biographies: [{ value: 'Notes personnelles à préserver' }],
    metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
  });
  await saveBooking(t.db, booking());
  await run(t.env, t.fetcher);
  await run(t.env, async (url, init) => {
    const result = await t.fetcher(url, init);
    if (new URL(url).pathname === '/v1/people/manual')
      t.sqlite.exec("UPDATE settings SET mode='paused'");
    return result;
  });
  const contact = t.sqlite
    .prepare('SELECT pending_block,creation_attempted FROM contacts')
    .get()!;
  assert.equal(contact.pending_block, null);
  assert.equal(contact.creation_attempted, 0);
  assert.equal(
    t.calls.filter(
      (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
    ).length,
    0
  );
  t.sqlite.exec("UPDATE settings SET mode='live'; UPDATE jobs SET due_at=0");
  await run(t.env, t.fetcher);
  assert.equal(
    t.sqlite.prepare('SELECT outcome FROM contacts').get()!.outcome,
    'synced'
  );
  assert.match(
    t.people.get('people/manual')!.biographies![0]!.value,
    /^Notes personnelles à préserver/
  );
});
