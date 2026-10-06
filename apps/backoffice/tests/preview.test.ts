import assert from 'node:assert/strict';
import test from 'node:test';
import { database } from './fixtures/database.ts';
import { copyContactsToPreview } from '../src/preview-copy.ts';
import { previewContacts } from '../src/preview-contacts.ts';
import { createPreviewHandler } from '../src/preview.ts';
import { createBackofficeHandler } from '../src/index.ts';
import { ALLOWED_EMAIL, AccessError, type Env } from '../src/config.ts';
import type { GoogleContact, ContactPage } from '../src/contact-types.ts';

function fixture(count = 1103) {
  const production = database(),
    preview = database();
  const contacts: GoogleContact[] = Array.from({ length: count }, (_, i) => ({
    id: `people/c${String(i).padStart(5, '0')}`,
    name: `Contact ${i}`,
    givenName: 'Contact',
    familyName: String(i),
    etag: `v1-${i}`,
    emails: [`contact${i}@example.test`],
    phones: ['0000000000'],
    animals: ['Moka'],
    lastAppointment: null,
    labelIds: ['contactGroups/test'],
  }));
  let fail = false;
  const requests: Request[] = [];
  const env = {
    APP_ENVIRONMENT: 'production',
    APP_ORIGIN: 'https://backoffice.osteopathie-animale-bordeaux.fr',
    ACCESS_TEAM_DOMAIN: 'https://fictitious-tests.cloudflareaccess.com',
    ACCESS_AUD: 'a'.repeat(64),
    DB: production.db,
    PREVIEW_DB: preview.db,
    GOOGLE_CONTACTS: {
      async fetch(request: Request) {
        requests.push(request);
        assert.equal(request.method, 'GET');
        if (fail) throw new Error('private-upstream-information');
        const url = new URL(request.url);
        if (url.pathname === '/labels')
          return Response.json({
            labels: [{ id: 'contactGroups/test', name: 'Test' }],
            nextPageToken: null,
          });
        const offset = Number(url.searchParams.get('pageToken') ?? 0);
        return Response.json({
          contacts: contacts
            .slice(offset, offset + 1000)
            .map((contact) => ({ ...contact, biographies: ['private-note'] })),
          nextPageToken:
            offset + 1000 < contacts.length ? String(offset + 1000) : null,
          appointmentsAvailable: true,
        });
      },
    },
  } as Env;
  const previewEnv = {
    ...env,
    APP_ENVIRONMENT: 'preview',
    APP_ORIGIN: 'https://backoffice-preview.osteopathie-animale-bordeaux.fr',
    DB: preview.db,
    PREVIEW_DB: undefined,
  } as Env;
  return {
    production,
    preview,
    env,
    previewEnv,
    contacts,
    requests,
    fail: (value: boolean) => {
      fail = value;
    },
  };
}
async function copy(env: Env) {
  let result = await copyContactsToPreview({ action: 'start' }, env);
  while (result.next)
    result = await copyContactsToPreview(
      { action: 'continue', id: result.id },
      env
    );
  return result;
}
const read = async (db: D1Database, cursor?: string) =>
  (await (
    await previewContacts(db).fetch(
      new Request(
        `https://contacts.internal/contacts${cursor ? `?pageToken=${encodeURIComponent(cursor)}` : ''}`
      )
    )
  ).json()) as ContactPage;

test('copy all Google pages into preview only, atomically activate and preserve lists', async () => {
  const f = fixture();
  f.preview.sqlite.exec(
    "INSERT INTO mailing_lists (id, name) VALUES ('test', 'Essais')"
  );
  const job = await copyContactsToPreview({ action: 'start' }, f.env);
  const before = f.preview.queries();
  const first = await copyContactsToPreview(
    { action: 'continue', id: job.id },
    f.env
  );
  assert.equal(first.copied, 1000);
  assert.ok(f.preview.queries() - before < 40);
  assert.equal((await read(f.preview.db)).contacts.length, 0);
  let result = first;
  while (result.next)
    result = await copyContactsToPreview(
      { action: 'continue', id: job.id },
      f.env
    );
  assert.equal(result.copied, 1103);
  assert.deepEqual(
    await copyContactsToPreview({ action: 'continue', id: job.id }, f.env),
    result
  );
  let page = await read(f.preview.db),
    all = page.contacts;
  while (page.nextPageToken) {
    page = await read(f.preview.db, page.nextPageToken);
    all = all.concat(page.contacts);
  }
  assert.equal(all.length, 1103);
  assert.doesNotMatch(JSON.stringify(all), /private-note/);
  assert.equal(
    f.production.sqlite
      .prepare('SELECT COUNT(*) AS n FROM copied_contacts')
      .get()!.n,
    0
  );
  assert.equal(
    f.preview.sqlite.prepare('SELECT COUNT(*) AS n FROM mailing_lists').get()!
      .n,
    1
  );
  assert.ok(
    f.requests.every(
      (request) => request.headers.get('X-Contacts-Account') === ALLOWED_EMAIL
    )
  );
  f.production.sqlite.close();
  f.preview.sqlite.close();
});

test('preview edits persist across handler instances, reject stale edits and never write to Google', async () => {
  const f = fixture(2);
  await copy(f.env);
  const contact = (await read(f.preview.db)).contacts[0]!;
  const request = () =>
    new Request('https://contacts.internal/contact', {
      method: 'PATCH',
      body: JSON.stringify({ ...contact, givenName: 'Copie modifiée' }),
    });
  assert.equal(
    (await previewContacts(f.preview.db).fetch(request())).status,
    200
  );
  assert.equal(
    (await previewContacts(f.preview.db).fetch(request())).status,
    409
  );
  assert.equal(
    (await read(f.preview.db)).contacts[0]!.givenName,
    'Copie modifiée'
  );
  assert.equal(f.contacts[0]!.givenName, 'Contact');
  assert.ok(f.requests.every((request) => request.method === 'GET'));
  await copy(f.env);
  assert.equal((await read(f.preview.db)).contacts[0]!.givenName, 'Contact');
  assert.equal(
    f.preview.sqlite
      .prepare('SELECT COUNT(*) AS n FROM contact_snapshots')
      .get()!.n,
    1
  );
  f.production.sqlite.close();
  f.preview.sqlite.close();
});

test('an interrupted copy leaves the active copy intact and can resume', async () => {
  const f = fixture(3);
  await copy(f.env);
  const active = f.preview.sqlite
    .prepare('SELECT active_snapshot FROM preview_state')
    .get()!.active_snapshot;
  const job = await copyContactsToPreview({ action: 'start' }, f.env);
  f.fail(true);
  await assert.rejects(
    copyContactsToPreview({ action: 'continue', id: job.id }, f.env),
    { code: 'preview_copy_failed' }
  );
  assert.equal(
    f.preview.sqlite.prepare('SELECT active_snapshot FROM preview_state').get()!
      .active_snapshot,
    active
  );
  assert.equal((await read(f.preview.db)).contacts.length, 3);
  f.fail(false);
  assert.equal(
    (await copyContactsToPreview({ action: 'start' }, f.env)).id,
    job.id
  );
  let result = await copyContactsToPreview(
    { action: 'continue', id: job.id },
    f.env
  );
  while (result.next)
    result = await copyContactsToPreview(
      { action: 'continue', id: job.id },
      f.env
    );
  assert.notEqual(
    f.preview.sqlite.prepare('SELECT active_snapshot FROM preview_state').get()!
      .active_snapshot,
    active
  );
  f.production.sqlite.close();
  f.preview.sqlite.close();
});

test('preview uses Access before reading storage and ignores any Google binding', async () => {
  const f = fixture(2);
  await copy(f.env);
  const calls = f.requests.length,
    queries = f.preview.queries();
  const denied = createPreviewHandler(async () => {
    throw new AccessError(401, 'missing_token');
  });
  assert.equal(
    (
      await denied(
        new Request(`${f.previewEnv.APP_ORIGIN}/api/contacts`),
        f.previewEnv
      )
    ).status,
    401
  );
  assert.equal(f.preview.queries(), queries);
  const handle = createPreviewHandler(async () => ({
    email: ALLOWED_EMAIL,
    name: 'Agathe Lescout',
  }));
  const response = await handle(
    new Request(`${f.previewEnv.APP_ORIGIN}/api/contacts`),
    f.previewEnv
  );
  assert.equal(response.status, 200);
  assert.equal(f.requests.length, calls);
  assert.match(
    await (
      await handle(new Request(f.previewEnv.APP_ORIGIN), f.previewEnv)
    ).text(),
    /data-hosted-preview="true"/
  );
  const write = new Request(`${f.previewEnv.APP_ORIGIN}/api/preview-copy`, {
    method: 'POST',
    headers: {
      Origin: f.previewEnv.APP_ORIGIN,
      'Content-Type': 'application/json',
    },
    body: '{"action":"start"}',
  });
  assert.equal((await handle(write, f.previewEnv)).status, 503);
  const productionHandle = createBackofficeHandler(async () => ({
    email: ALLOWED_EMAIL,
    name: 'Agathe Lescout',
  }));
  assert.equal(
    (
      await productionHandle(
        new Request(`${f.env.APP_ORIGIN}/api/preview-copy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
        f.env
      )
    ).status,
    403
  );
  f.production.sqlite.close();
  f.preview.sqlite.close();
});

test('snapshot pagination detects a replacement instead of mixing two contact copies', async () => {
  const f = fixture(503);
  await copy(f.env);
  const first = await read(f.preview.db);
  assert.ok(first.nextPageToken);
  await copy(f.env);
  const response = await previewContacts(f.preview.db).fetch(
    new Request(
      `https://contacts.internal/contacts?pageToken=${encodeURIComponent(first.nextPageToken)}`
    )
  );
  assert.equal(response.status, 409);
  f.production.sqlite.close();
  f.preview.sqlite.close();
});
