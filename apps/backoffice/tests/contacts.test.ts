import assert from 'node:assert/strict';
import test from 'node:test';
import { contactsPage } from '../src/contacts.ts';
import { CONTACTS_ACCOUNT_EMAIL, type Env } from '../src/config.ts';
import { createBackofficeHandler } from '../src/index.ts';

const origin = 'https://backoffice.osteopathie-animale-bordeaux.fr';
function fixture() {
  const calls: Request[] = [];
  const env = {
    APP_ORIGIN: origin,
    ACCESS_TEAM_DOMAIN: 'https://fictitious-tests.cloudflareaccess.com',
    ACCESS_AUD: 'a'.repeat(64),
    GOOGLE_CONTACTS: {
      async fetch(request: Request) {
        calls.push(request);
        if (request.method === 'PATCH') return Response.json({ saved: true });
        return Response.json({
          contacts: [
            {
              id: 'people/c1',
              name: '<script>untrusted</script>',
              givenName: '',
              familyName: '',
              etag: 'fake',
              emails: ['contact@example.test'],
              phones: [],
              labelIds: [],
              animals: ['Moka'],
              lastAppointment: null,
              history: [
                {
                  id: 'booking-1',
                  type: 'appointment',
                  date: '2026-01-02T10:00:00Z',
                  animal: 'Moka',
                  status: 'active',
                  note: 'private-note',
                },
                {
                  id: 'invalid',
                  type: 'appointment',
                  date: 'invalid',
                  animal: '',
                  status: 'active',
                },
              ],
              biographies: [{ value: 'private-note' }],
            },
          ],
          nextPageToken: null,
          appointmentsAvailable: true,
          privateToken: 'private-secret',
        });
      },
    },
  } as unknown as Env;
  const handle = createBackofficeHandler(async () => ({
    email: CONTACTS_ACCOUNT_EMAIL,
    name: 'Agathe Lescout',
  }));
  return { env, calls, handle };
}

test('contact pages use only the private binding with the pinned owner account and sanitize the DTO', async () => {
  const f = fixture();
  const data = await contactsPage(
    new URL(`${origin}/api/contacts?pageToken=next%26token`),
    f.env
  );
  assert.equal(
    f.calls[0]!.url,
    'https://contacts.internal/contacts?pageToken=next%26token'
  );
  assert.equal(
    f.calls[0]!.headers.get('X-Contacts-Account'),
    CONTACTS_ACCOUNT_EMAIL
  );
  assert.ok('contacts' in data);
  assert.deepEqual(data.contacts[0]?.history, [
    {
      id: 'booking-1',
      type: 'appointment',
      date: '2026-01-02T10:00:00Z',
      animal: 'Moka',
      status: 'active',
    },
  ]);
  assert.doesNotMatch(JSON.stringify(data), /private-note|private-secret/);
});

test('new APIs and module scripts authenticate before reading the service or storage', async () => {
  const f = fixture();
  const unauthenticated = createBackofficeHandler(async () => {
    throw new Error('no-session');
  });
  for (const path of [
    '/contacts',
    '/api/contacts',
    '/api/contact-labels',
    '/api/mailing-lists',
    '/assets/backoffice.js',
  ])
    assert.equal(
      (await unauthenticated(new Request(`${origin}${path}`), f.env)).status,
      503
    );
  assert.equal(f.calls.length, 0);
});

test('contact and list writes require same-origin JSON and reject CSRF before invoking services', async () => {
  const f = fixture();
  for (const [path, method] of [
    ['/api/contact', 'PATCH'],
    ['/api/mailing-lists', 'POST'],
    ['/api/list-memberships', 'PUT'],
  ]) {
    const badHeaders: Record<string, string>[] = [
      { 'Content-Type': 'application/json' },
      {
        Origin: 'https://other.example.test',
        'Content-Type': 'application/json',
      },
    ];
    for (const headers of badHeaders)
      assert.equal(
        (
          await f.handle(
            new Request(`${origin}${path}`, { method, headers, body: '{}' }),
            f.env
          )
        ).status,
        403
      );
    assert.equal(
      (
        await f.handle(
          new Request(`${origin}${path}`, {
            method,
            headers: { Origin: origin, 'Content-Type': 'text/plain' },
            body: '{}',
          }),
          f.env
        )
      ).status,
      415
    );
  }
  assert.equal(f.calls.length, 0);
  const saved = await f.handle(
    new Request(`${origin}/api/contact`, {
      method: 'PATCH',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'people/c1' }),
    }),
    f.env
  );
  assert.equal(saved.status, 200);
  assert.equal(f.calls.length, 1);
  assert.equal(saved.headers.get('Cache-Control'), 'private, no-store');
});

test('malformed/oversized JSON, cursors and upstream bodies cannot leak or reach the wrong service', async () => {
  const f = fixture();
  for (const [body, expected] of [
    ['{bad', 400],
    ['a'.repeat(65537), 413],
  ] as const)
    assert.equal(
      (
        await f.handle(
          new Request(`${origin}/api/contact`, {
            method: 'PATCH',
            headers: { Origin: origin, 'Content-Type': 'application/json' },
            body,
          }),
          f.env
        )
      ).status,
      expected
    );
  await assert.rejects(
    contactsPage(
      new URL(`${origin}/api/contacts?pageToken=a&pageToken=b`),
      f.env
    ),
    { code: 'invalid_cursor' }
  );
  assert.equal(f.calls.length, 0);
  f.env.GOOGLE_CONTACTS = {
    async fetch() {
      return new Response('private-upstream-details', { status: 500 });
    },
  } as unknown as Fetcher;
  const response = await f.handle(new Request(`${origin}/api/contacts`), f.env);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'google_contacts_unavailable',
  });
});

test('Ludwig reads the same pinned Agathe contact account', async () => {
  const f = fixture();
  const handle = createBackofficeHandler(async () => ({
    email: 'vantoursludwig@gmail.com',
    name: 'Ludwig Vantours',
  }));
  const response = await handle(new Request(`${origin}/api/contacts`), f.env);
  assert.equal(response.status, 200);
  assert.equal(
    f.calls[0]!.headers.get('X-Contacts-Account'),
    CONTACTS_ACCOUNT_EMAIL
  );
});
