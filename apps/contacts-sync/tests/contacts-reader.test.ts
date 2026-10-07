import assert from 'node:assert/strict';
import test from 'node:test';
import { readGoogleContacts } from '../src/contacts-reader.ts';
import worker from '../src/index.ts';
import { saveBooking } from '../src/store.ts';
import { booking, database, environment } from './helpers.ts';
import type { Env, Fetcher } from '../src/types.ts';

function fixture() {
  const { db, sqlite } = database();
  const env = environment(db);
  const calls: { url: URL; init?: RequestInit }[] = [];
  const person = {
    resourceName: 'people/c1',
    etag: 'fake-etag',
    metadata: {
      sources: [{ type: 'CONTACT', id: 'c1', etag: 'fake-source-etag' }],
    },
    names: [
      {
        displayName: 'Camille Exemple',
        givenName: 'Camille',
        familyName: 'Exemple',
      },
    ],
    emailAddresses: [{ value: 'person@example.com', type: 'work' }],
    phoneNumbers: [{ value: '00 00 00 00 01', type: 'mobile' }],
    memberships: [
      {
        contactGroupMembership: {
          contactGroupResourceName: 'contactGroups/calendly',
        },
      },
    ],
    biographies: [{ value: 'private-clinical-note' }],
    userDefined: [{ key: 'private', value: 'private-custom-value' }],
  };
  const fetcher: Fetcher = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.hostname === 'oauth2.googleapis.com')
      return Response.json({ access_token: 'fake-access-token' });
    if (url.hostname === 'openidconnect.googleapis.com')
      return Response.json({
        sub: 'owner-id',
        email: env.EXPECTED_GOOGLE_EMAIL,
        email_verified: true,
      });
    assert.equal(
      init?.headers && new Headers(init.headers).get('Authorization'),
      'Bearer fake-access-token'
    );
    if (url.pathname === '/v1/people/me/connections')
      return Response.json({
        connections: [
          person,
          { resourceName: 'people/deleted', metadata: { deleted: true } },
        ],
        nextPageToken: 'next&token',
      });
    if (url.pathname === '/v1/contactGroups')
      return Response.json({
        contactGroups: [
          {
            resourceName: 'contactGroups/calendly',
            name: 'Calendly',
            groupType: 'USER_CONTACT_GROUP',
          },
          {
            resourceName: 'contactGroups/myContacts',
            name: 'My Contacts',
            groupType: 'SYSTEM_CONTACT_GROUP',
          },
        ],
      });
    if (url.pathname === '/v1/people/c1') return Response.json(person);
    if (url.pathname === '/v1/people/c1:updateContact')
      return Response.json({ resourceName: 'people/c1' });
    throw new Error('unexpected test upstream');
  };
  const request = (path = '/contacts', init: RequestInit = {}) =>
    new Request(`https://contacts.internal${path}`, {
      ...init,
      headers: {
        'X-Contacts-Account': env.EXPECTED_GOOGLE_EMAIL,
        ...init.headers,
      },
    });
  return { env, sqlite, calls, fetcher, person, request };
}

test('contacts are reduced to requested fields and booking history excludes future/canceled last appointments', async () => {
  const f = fixture();
  await saveBooking(
    f.env.DB,
    booking('past', {
      animal: 'Moka',
      animalType: 'Chien',
      start: '2020-01-02T10:00:00Z',
    })
  );
  await saveBooking(
    f.env.DB,
    booking('canceled', {
      animal: 'Moka',
      status: 'canceled',
      start: '2025-01-02T10:00:00Z',
    })
  );
  await saveBooking(
    f.env.DB,
    booking('future', { animal: 'Nala', start: '2999-01-02T10:00:00Z' })
  );
  f.sqlite.exec("UPDATE contacts SET resource_name = 'people/c1'");
  const before = f.sqlite.prepare('SELECT total_changes() AS count').get()!
    .count;
  const response = await readGoogleContacts(
    f.request('/contacts?pageToken=next%26token'),
    f.env,
    f.fetcher
  );
  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    contacts: {
      animals: string[];
      animalTypes: string[];
      lastAppointment: string;
      history: {
        id: string;
        type: string;
        date: string;
        animal: string;
        status: string;
      }[];
    }[];
    appointmentsAvailable: boolean;
    nextPageToken: string;
  };
  assert.equal(data.contacts.length, 1);
  assert.deepEqual(data.contacts[0]!.animals, ['Moka', 'Nala']);
  assert.deepEqual(data.contacts[0]!.animalTypes, ['Chien']);
  assert.equal(data.contacts[0]!.lastAppointment, '2020-01-02T10:00:00Z');
  assert.equal(data.contacts[0]!.history.length, 3);
  assert.equal(
    data.contacts[0]!.history.filter((event) => event.status === 'canceled')
      .length,
    1
  );
  assert.ok(
    data.contacts[0]!.history.some(
      (event) => event.date === '2999-01-02T10:00:00Z'
    )
  );
  assert.ok(
    data.contacts[0]!.history.every(
      (event) => event.type === 'appointment' && event.id
    )
  );
  assert.equal(data.appointmentsAvailable, true);
  assert.equal(data.nextPageToken, 'next&token');
  assert.doesNotMatch(
    JSON.stringify(data),
    /private-clinical|private-custom|fake-access|fake-refresh/
  );
  const query = f.calls.find((call) =>
    call.url.pathname.endsWith('/connections')
  )!.url.searchParams;
  assert.equal(query.get('pageToken'), 'next&token');
  assert.equal(query.get('sources'), 'READ_SOURCE_TYPE_CONTACT');
  assert.equal(
    query.get('personFields'),
    'names,emailAddresses,phoneNumbers,memberships,metadata'
  );
  assert.equal(
    f.sqlite.prepare('SELECT total_changes() AS count').get()!.count,
    before
  );
  assert.equal(
    f.sqlite.prepare('SELECT mode FROM settings').get()!.mode,
    'paused'
  );
  f.sqlite.close();
});

test('missing booking storage is explicit while Google contacts remain available', async () => {
  const f = fixture();
  const response = await readGoogleContacts(
    f.request(),
    { ...f.env, DB: undefined } as unknown as Env,
    f.fetcher
  );
  const data = (await response.json()) as {
    appointmentsAvailable: boolean;
    contacts: unknown[];
  };
  assert.equal(data.appointmentsAvailable, false);
  assert.equal(data.contacts.length, 1);
  f.sqlite.close();
});

test('only user-created Google labels are returned', async () => {
  const f = fixture();
  const response = await readGoogleContacts(
    f.request('/labels'),
    f.env,
    f.fetcher
  );
  assert.deepEqual(await response.json(), {
    labels: [{ id: 'contactGroups/calendly', name: 'Calendly' }],
    nextPageToken: null,
  });
  f.sqlite.close();
});

test('wrong accounts, unsupported routes and malformed cursors never call Google', async () => {
  const f = fixture();
  for (const path of [
    '/contacts?pageToken=',
    '/contacts?pageToken=a&pageToken=b',
    '/contacts?personFields=biographies',
    '/contacts?pageToken=%00',
  ])
    assert.equal(
      (await readGoogleContacts(f.request(path), f.env, f.fetcher)).status,
      400
    );
  assert.equal(
    (
      await readGoogleContacts(
        f.request('/contacts', {
          headers: { 'X-Contacts-Account': 'other@example.test' },
        }),
        f.env,
        f.fetcher
      )
    ).status,
    503
  );
  assert.equal(
    (
      await readGoogleContacts(
        f.request('/contacts', { method: 'POST' }),
        f.env,
        f.fetcher
      )
    ).status,
    405
  );
  assert.equal(
    (
      await readGoogleContacts(
        new Request('https://example.test/contacts'),
        f.env,
        f.fetcher
      )
    ).status,
    404
  );
  assert.equal(f.calls.length, 0);
  f.sqlite.close();
});

test('the public sync Worker never exposes the contacts reader or editor', async () => {
  const f = fixture();
  for (const path of [
    '/contacts',
    '/labels',
    '/contact',
    '/api/contacts',
    '/api/contact',
  ]) {
    for (const method of ['GET', 'PATCH'])
      assert.equal(
        (
          await worker.fetch(
            new Request(`https://example.test${path}`, { method }),
            f.env
          )
        ).status,
        404
      );
  }
  assert.equal(f.calls.length, 0);
  f.sqlite.close();
});

test('OAuth account verification and failures do not expose upstream private data', async () => {
  const f = fixture();
  const mismatch: Fetcher = (input, init) =>
    new URL(input).hostname === 'openidconnect.googleapis.com'
      ? Promise.resolve(
          Response.json({
            sub: 'other',
            email: 'other@example.test',
            email_verified: true,
          })
        )
      : f.fetcher(input, init);
  assert.deepEqual(
    await (await readGoogleContacts(f.request(), f.env, mismatch)).json(),
    { error: 'google_connection_unavailable' }
  );
  const failed: Fetcher = async () =>
    new Response('private-upstream-token-and-personal-data', { status: 400 });
  const response = await readGoogleContacts(f.request(), f.env, failed);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'google_reconnection_required',
  });
  assert.equal(
    f.calls.some((call) => call.url.hostname === 'people.googleapis.com'),
    false
  );
  f.sqlite.close();
});

test('editing preserves field types and updates only coordinates with the current source etag', async () => {
  const f = fixture();
  const response = await readGoogleContacts(
    f.request('/contact', {
      method: 'PATCH',
      body: JSON.stringify({
        id: 'people/c1',
        etag: f.person.etag,
        givenName: 'Camille',
        familyName: 'Modifié',
        emails: ['person@example.com', 'other@example.test'],
        phones: ['00 00 00 00 01'],
      }),
    }),
    f.env,
    f.fetcher
  );
  assert.equal(response.status, 200);
  const update = f.calls.find((call) => call.init?.method === 'PATCH')!;
  assert.equal(
    update.url.searchParams.get('updatePersonFields'),
    'names,emailAddresses,phoneNumbers'
  );
  const body = JSON.parse(String(update.init!.body));
  assert.deepEqual(body.metadata.sources, f.person.metadata.sources);
  assert.equal(body.emailAddresses[0].type, 'work');
  assert.equal(body.phoneNumbers[0].type, 'mobile');
  assert.equal(body.biographies, undefined);
  assert.equal(body.memberships, undefined);
  assert.equal(body.userDefined, undefined);
  f.sqlite.close();
});

test('stale or invalid edits cannot overwrite Google data', async () => {
  const f = fixture();
  const payload = {
    id: 'people/c1',
    etag: 'stale-etag',
    givenName: 'Camille',
    familyName: 'Exemple',
    emails: ['person@example.com'],
    phones: [],
  };
  assert.equal(
    (
      await readGoogleContacts(
        f.request('/contact', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }),
        f.env,
        f.fetcher
      )
    ).status,
    409
  );
  for (const edit of [
    { ...payload, id: '//other.test' },
    { ...payload, emails: ['invalid'] },
    { ...payload, givenName: 'a\nheader' },
  ])
    assert.equal(
      (
        await readGoogleContacts(
          f.request('/contact', {
            method: 'PATCH',
            body: JSON.stringify(edit),
          }),
          f.env,
          f.fetcher
        )
      ).status,
      400
    );
  assert.equal(
    f.calls.some((call) => call.init?.method === 'PATCH'),
    false
  );
  f.sqlite.close();
});
