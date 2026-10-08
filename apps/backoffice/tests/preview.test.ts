import assert from 'node:assert/strict';
import test from 'node:test';
import { database } from './fixtures/database.ts';
import { copyContactsToPreview } from '../src/preview-copy.ts';
import { previewContacts } from '../src/preview-contacts.ts';
import { createPreviewHandler } from '../src/preview.ts';
import { createBackofficeHandler } from '../src/index.ts';
import {
  CONTACTS_ACCOUNT_EMAIL,
  AccessError,
  type Env,
} from '../src/config.ts';
import type { GoogleContact, ContactPage } from '../src/contact-types.ts';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { businessSnapshotQuery } from '../src/copy-data.ts';
import {
  previewSnapshotQuery,
  snapshotFromRows,
} from '../scripts/local-preview-data.mjs';
import { createLocalTransport } from '../scripts/local-database.mjs';
import { contactSummary } from '../src/contact-summary.ts';
import { SUMMARY_MODEL, SUMMARY_PROMPT_VERSION } from '../src/summary-model.ts';

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
        if (url.pathname === '/sources') {
          const offset = Number(url.searchParams.get('pageToken') ?? 0);
          return Response.json({
            contacts: contacts.slice(offset, offset + 100).map((contact) => ({
              id: contact.id,
              notesState: 'ready',
              observedAt: '2026-10-08T08:00:00Z',
              notes: [
                {
                  id: 'google-note:0',
                  kind: 'google-note',
                  text: 'Note privée fictive.',
                },
              ],
              appointments: [],
            })),
            nextPageToken:
              offset + 100 < contacts.length ? String(offset + 100) : null,
          });
        }
        if (url.pathname === '/calendar-appointments')
          return Response.json({
            appointments: [],
            from: url.searchParams.get('from'),
            to: url.searchParams.get('to'),
            checkedAt: '2026-10-08T08:00:00Z',
          });
        if (url.pathname === '/next-appointment')
          return Response.json({
            appointment: null,
            checkedAt: '2026-10-08T08:00:00Z',
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

test('a contact added between the contacts and sources scans restarts staging before publication', async () => {
  const f = fixture(1);
  try {
    let step = await copyContactsToPreview({ action: 'start' }, f.env);
    while (
      f.preview.sqlite.prepare('SELECT phase FROM preview_state').get()!
        .phase !== 'sources'
    )
      step = await copyContactsToPreview(
        { action: 'continue', id: step.id },
        f.env
      );
    f.contacts.push({
      ...f.contacts[0]!,
      id: 'people/new-contact',
      etag: 'new',
    });
    while (
      f.preview.sqlite.prepare('SELECT phase FROM preview_state').get()!
        .phase !== 'calendar'
    )
      step = await copyContactsToPreview(
        { action: 'continue', id: step.id },
        f.env
      );
    step = await copyContactsToPreview(
      { action: 'continue', id: step.id },
      f.env
    );
    assert.equal(step.copied, 0);
    assert.equal((await read(f.preview.db)).contacts.length, 0);
    while (step.next)
      step = await copyContactsToPreview(
        { action: 'continue', id: step.id },
        f.env
      );
    assert.equal((await read(f.preview.db)).contacts.length, 2);
  } finally {
    f.production.sqlite.close();
    f.preview.sqlite.close();
  }
});
const read = async (db: D1Database, cursor?: string) =>
  (await (
    await previewContacts(db).fetch(
      new Request(
        `https://contacts.internal/contacts${cursor ? `?pageToken=${encodeURIComponent(cursor)}` : ''}`
      )
    )
  ).json()) as ContactPage;

test('complete copies retain exact private sources, business fields, summaries and PDF bytes through preview and local', async () => {
  const f = fixture(2);
  const directory = await mkdtemp(join(tmpdir(), 'osteo-complete-copy-test-'));
  try {
    const id = f.contacts[0]!.id;
    const source = {
      id,
      notesState: 'ready',
      observedAt: '2026-10-08T08:00:00Z',
      notes: [
        {
          id: 'google-note:0',
          kind: 'google-note',
          text: 'Note privée fictive.',
        },
      ],
      appointments: [],
      contextualAnimals: ['Moka'],
    };
    const summary = {
      sentences: Array.from({ length: 3 }, () => ({
        text: 'Phrase fictive de synthèse.',
        sourceIds: ['google-note:0'],
      })),
    };
    const pdf = Buffer.from('%PDF-1.7\nFictitious private original\n%%EOF');
    const sha = createHash('sha256').update(pdf).digest('hex');
    f.production.sqlite
      .prepare('INSERT INTO contact_summary_sources VALUES (?,?,?,?,?,?)')
      .run(
        id,
        JSON.stringify(source),
        'hash',
        'ready',
        source.observedAt,
        null
      );
    f.production.sqlite
      .prepare('INSERT INTO contact_summaries VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(
        id,
        'hash',
        JSON.stringify(summary),
        JSON.stringify(source),
        SUMMARY_MODEL,
        SUMMARY_PROMPT_VERSION,
        source.observedAt,
        20,
        30,
        40
      );
    f.production.sqlite
      .prepare(
        'INSERT INTO consultation_reports(id,account,message_id,attachment_index,filename,sent_at,recipients,sha256,size,contact_id,match_status) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      )
      .run(
        sha,
        'owner@example.test',
        'message',
        0,
        'Compte rendu fictif.pdf',
        source.observedAt,
        '["recipient@example.test"]',
        sha,
        pdf.length,
        id,
        'linked'
      );
    f.production.sqlite.exec(
      "INSERT INTO mailing_lists(id,name,created_at,updated_at,archived_at) VALUES ('archive','Liste archivée','2025-01-01','2025-02-01','2025-03-01'); INSERT INTO mailing_list_contacts VALUES ('archive','people/c00000','unsubscribed');"
    );
    // A historical journal must not replay an old name over the copied contact.
    const historical = {
      ...f.contacts[0],
      givenName: 'Ancien',
      identity: { animals: [] },
    };
    f.production.sqlite
      .prepare(
        'INSERT INTO identity_reviews(id,contact_id,snapshot_id,actor,action,before_document,after_document) VALUES (?,?,?,?,?,?,?)'
      )
      .run(
        'review',
        id,
        'historical',
        'owner@example.test',
        'apply',
        '{}',
        JSON.stringify(historical)
      );
    const objects = new Map<string, Buffer>();
    f.env.REPORTS = {
      async get(key: string) {
        return key === `${sha}.pdf` ? { body: pdf } : null;
      },
    } as unknown as Env['REPORTS'];
    f.env.PREVIEW_REPORTS = {
      async put(key: string, body: Buffer) {
        objects.set(key, Buffer.from(body));
      },
    } as unknown as Env['PREVIEW_REPORTS'];
    await copy(f.env);
    assert.deepEqual(objects.get(`${sha}.pdf`), pdf);
    assert.deepEqual(
      await contactSummary(id, f.previewEnv),
      await contactSummary(id, f.env)
    );
    assert.equal((await read(f.preview.db)).contacts[0]!.givenName, 'Contact');
    const exactQuery = `${businessSnapshotQuery} ORDER BY table_name,row_id`;
    assert.deepEqual(
      f.preview.sqlite.prepare(exactQuery).all(),
      f.production.sqlite.prepare(exactQuery).all()
    );
    const snapshot = snapshotFromRows(
      f.preview.sqlite.prepare(previewSnapshotQuery).all()
    );
    assert.equal(snapshot.dataVersion, 1);
    const { contextualAnimals, ...privateSource } = source;
    assert.ok(contextualAnimals.length);
    assert.deepEqual(snapshot.contactSources[0], privateSource);
    const localPath = pathToFileURL(join(directory, 'local.sqlite'));
    await mkdir(join(directory, 'consultation-reports'), { mode: 0o700 });
    await writeFile(
      join(directory, 'consultation-reports', `${sha}.pdf`),
      pdf,
      { mode: 0o600 }
    );
    const local = createLocalTransport(snapshot, localPath);
    try {
      const db = new DatabaseSync(join(directory, 'local.sqlite'), {
        readOnly: true,
      });
      try {
        assert.deepEqual(
          db.prepare(exactQuery).all(),
          f.production.sqlite.prepare(exactQuery).all()
        );
      } finally {
        db.close();
      }
      assert.deepEqual(
        await local(`/api/contact-summary?id=${encodeURIComponent(id)}`),
        await contactSummary(id, f.env)
      );
      const response = await local.fetchResponse(
        `/api/consultation-pdf?id=${sha}`
      );
      assert.equal(response.status, 200);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    } finally {
      local.close();
    }
  } finally {
    f.production.sqlite.close();
    f.preview.sqlite.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('a full replacement archives preview corrections instead of losing them or replaying them over production', async () => {
  const f = fixture(1);
  try {
    await copy(f.env);
    const previous = f.preview.sqlite
      .prepare('SELECT active_snapshot FROM preview_state')
      .get()!.active_snapshot as string;
    const before = (await read(f.preview.db)).contacts[0]!;
    const after = {
      ...before,
      givenName: 'Essai local',
      identity: {
        originalName: before.name,
        reviewId: 'preview-review',
        animals: [],
      },
    };
    f.preview.sqlite
      .prepare(
        'INSERT INTO identity_reviews(id,contact_id,snapshot_id,actor,action,before_document,after_document) VALUES (?,?,?,?,?,?,?)'
      )
      .run(
        'preview-review',
        before.id,
        previous,
        'owner@example.test',
        'apply',
        JSON.stringify(before),
        JSON.stringify(after)
      );
    await copy(f.env);
    assert.equal(
      (await read(f.preview.db)).contacts[0]!.givenName,
      before.givenName
    );
    assert.equal(
      f.preview.sqlite
        .prepare('SELECT COUNT(*) AS n FROM identity_reviews')
        .get()!.n,
      0
    );
    const archive = f.preview.sqlite
      .prepare(
        "SELECT document FROM copied_business_rows WHERE snapshot_id=? AND table_name='identity_reviews'"
      )
      .get(previous)!;
    assert.equal(
      JSON.parse(String(archive.document)).after_document,
      JSON.stringify(after)
    );
    assert.equal(
      JSON.parse(
        String(
          f.preview.sqlite
            .prepare(
              'SELECT document FROM copied_contacts WHERE snapshot_id=? AND id=?'
            )
            .get(previous, before.id)!.document
        )
      ).givenName,
      'Essai local'
    );
  } finally {
    f.production.sqlite.close();
    f.preview.sqlite.close();
  }
});

test('business changes during pagination are reread before activation and missing PDFs preserve the previous copy', async () => {
  const f = fixture(1);
  try {
    await copy(f.env);
    const previous = f.preview.sqlite
      .prepare('SELECT active_snapshot FROM preview_state')
      .get()!.active_snapshot;
    let step = await copyContactsToPreview({ action: 'start' }, f.env);
    while (
      f.preview.sqlite.prepare('SELECT phase FROM preview_state').get()!
        .phase !== 'calendar'
    )
      step = await copyContactsToPreview(
        { action: 'continue', id: step.id },
        f.env
      );
    f.production.sqlite.exec(
      "INSERT INTO mailing_lists(id,name) VALUES ('changed','Modification pendant la copie')"
    );
    step = await copyContactsToPreview(
      { action: 'continue', id: step.id },
      f.env
    );
    assert.equal(step.next, true);
    assert.equal(
      f.preview.sqlite
        .prepare('SELECT active_snapshot FROM preview_state')
        .get()!.active_snapshot,
      previous
    );
    while (step.next)
      step = await copyContactsToPreview(
        { action: 'continue', id: step.id },
        f.env
      );
    assert.equal(
      f.preview.sqlite.prepare('SELECT name FROM mailing_lists').get()!.name,
      'Modification pendant la copie'
    );
    const active = f.preview.sqlite
      .prepare('SELECT active_snapshot FROM preview_state')
      .get()!.active_snapshot;
    const sha = 'a'.repeat(64);
    f.production.sqlite
      .prepare(
        "INSERT INTO consultation_reports(id,account,message_id,attachment_index,filename,sent_at,recipients,sha256,size,match_status) VALUES (?, 'owner@example.test','message',0,'test.pdf','2026-10-08','[]',?,100,'unmatched')"
      )
      .run(sha, sha);
    await assert.rejects(copy(f.env), { code: 'preview_copy_failed' });
    assert.equal(
      f.preview.sqlite
        .prepare('SELECT active_snapshot FROM preview_state')
        .get()!.active_snapshot,
      active
    );
  } finally {
    f.production.sqlite.close();
    f.preview.sqlite.close();
  }
});

test('copy all production pages into preview only and atomically replace lists with their production values', async () => {
  const f = fixture();
  f.preview.sqlite.exec(
    "INSERT INTO mailing_lists (id, name) VALUES ('test', 'Essais')"
  );
  f.production.sqlite.exec(
    "INSERT INTO mailing_lists(id,name,description) VALUES ('production', 'Liste réelle fictive', 'Description de production')"
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
  assert.equal(
    f.preview.sqlite.prepare('SELECT id FROM mailing_lists').get()!.id,
    'production'
  );
  assert.ok(
    f.requests.every(
      (request) =>
        request.headers.get('X-Contacts-Account') === CONTACTS_ACCOUNT_EMAIL
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
    2
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
    email: CONTACTS_ACCOUNT_EMAIL,
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
    email: CONTACTS_ACCOUNT_EMAIL,
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

test('preview accepts its deployed and official hosts, rejects production and arbitrary hosts', async () => {
  const f = fixture(2);
  await copy(f.env);
  const handle = createPreviewHandler(async () => ({
    email: CONTACTS_ACCOUNT_EMAIL,
    name: 'Agathe Lescout',
  }));
  try {
    for (const origin of [
      'https://admin-preview.osteopathie-animale-bordeaux.fr',
      'https://osteo-backoffice-preview.lvantours.workers.dev',
      'https://admin.osteopathie-animale-bordeaux.fr',
      'https://other.example.test',
    ]) {
      const response = await handle(new Request(`${origin}/api/contacts`), {
        ...f.previewEnv,
        APP_ORIGIN: origin,
      });
      assert.equal(
        response.status,
        origin.includes('admin-preview.') ||
          origin.includes('osteo-backoffice-preview.')
          ? 200
          : 503
      );
    }
  } finally {
    f.production.sqlite.close();
    f.preview.sqlite.close();
  }
});
