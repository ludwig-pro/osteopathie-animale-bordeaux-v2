import assert from 'node:assert/strict';
import test from 'node:test';
import { database } from './fixtures/database.ts';
import { identitySuggestion } from '../src/contact-identity.ts';
import { reviewIdentity, identityHistory } from '../src/identity-review.ts';
import { createPreviewHandler } from '../src/preview.ts';
import {
  previewSnapshotQuery,
  snapshotFromRows,
} from '../scripts/local-preview-data.mjs';
import { createLocalTransport } from '../scripts/local-database.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import {
  CONTACTS_ACCOUNT_EMAIL,
  AccessError,
  type Env,
} from '../src/config.ts';
import type { GoogleContact } from '../src/contact-types.ts';

const contact: GoogleContact = {
  id: 'people/test',
  etag: 'v1',
  name: 'Martin Camille (Luna)',
  givenName: 'Martin Camille (Luna)',
  familyName: '',
  emails: ['fictitious@example.test'],
  phones: ['0000000000'],
  animals: [],
  labelIds: [],
  lastAppointment: null,
};
const input = {
  action: 'apply',
  ...identitySuggestion(contact),
  id: contact.id,
  etag: contact.etag,
};
function fixture() {
  const f = database();
  f.sqlite.exec(
    "INSERT INTO contact_snapshots(id) VALUES ('snapshot'); UPDATE preview_state SET active_snapshot='snapshot' WHERE id=1;"
  );
  f.sqlite
    .prepare('INSERT INTO copied_contacts VALUES (?,?,?,?)')
    .run('snapshot', contact.id, contact.etag, JSON.stringify(contact));
  return {
    ...f,
    env: { APP_ENVIRONMENT: 'preview', DB: f.db } as Env,
    read: () =>
      JSON.parse(
        f.sqlite.prepare('SELECT document FROM copied_contacts').get()!
          .document as string
      ) as GoogleContact,
  };
}

test('legacy surname-first and parenthesis extraction are proposals; compound and structured names are preserved', () => {
  const original = structuredClone(contact);
  assert.equal(input.givenName, 'Camille');
  assert.equal(input.familyName, 'Martin');
  assert.equal(input.animals[0]?.name, 'Luna');
  assert.deepEqual(contact, original);
  const structured = {
    ...contact,
    givenName: 'Jean-Pierre',
    familyName: 'de La Tour',
    name: 'Jean-Pierre de La Tour',
  };
  assert.equal(identitySuggestion(structured).familyName, 'de La Tour');
  const multiple = {
    ...contact,
    name: 'Martin Camille (Luna / Moka)',
    animals: ['Luna'],
  };
  assert.equal(identitySuggestion(multiple).animals.length, 2); // Ambiguous annotation is not silently split/merged.
  assert.equal(
    identitySuggestion({ ...contact, animals: ['Luna'] }).animals.length,
    1
  );
});

test('validated identity, independent animals and private journal commit together, with stale-write and undo protection', async () => {
  const f = fixture();
  try {
    const result = await reviewIdentity(input, f.env, 'reviewer');
    const saved = f.read();
    assert.equal(saved.name, 'Camille Martin');
    assert.deepEqual(saved.animals, ['Luna']);
    assert.deepEqual(saved.emails, contact.emails);
    assert.deepEqual(saved.phones, contact.phones);
    assert.equal(
      f.sqlite.prepare('SELECT count(*) AS n FROM contact_animals').get()!.n,
      1
    );
    assert.equal((await identityHistory(contact.id, f.env)).history.length, 1);
    await assert.rejects(reviewIdentity(input, f.env, 'reviewer'), {
      code: 'contact_changed',
    });
    const again = await reviewIdentity(
      { ...input, etag: saved.etag, animals: saved.identity!.animals },
      f.env,
      'reviewer'
    );
    assert.equal(
      f.read().identity!.animals[0]!.id,
      saved.identity!.animals[0]!.id
    );
    await assert.rejects(
      reviewIdentity(
        {
          action: 'restore',
          id: contact.id,
          etag: f.read().etag,
          reviewId: result.reviewId,
        },
        f.env,
        'reviewer'
      ),
      { code: 'contact_changed' }
    );
    await reviewIdentity(
      {
        action: 'restore',
        id: contact.id,
        etag: f.read().etag,
        reviewId: again.reviewId,
      },
      f.env,
      'reviewer'
    );
    assert.equal(f.read().name, 'Camille Martin');
  } finally {
    f.sqlite.close();
  }
});

test('undo restores original animal/name values and active snapshot cannot erase reviews', async () => {
  const f = fixture();
  try {
    const result = await reviewIdentity(input, f.env, 'reviewer');
    f.sqlite.exec("INSERT INTO contact_snapshots(id) VALUES ('new')");
    assert.throws(
      () => f.sqlite.exec("UPDATE preview_state SET import_id='new'"),
      /preview_has_corrections/
    );
    assert.equal(
      f.sqlite.prepare('SELECT import_id FROM preview_state').get()!.import_id,
      null
    );
    assert.throws(
      () => f.sqlite.exec("UPDATE preview_state SET active_snapshot='new'"),
      /preview_has_corrections/
    );
    await reviewIdentity(
      {
        action: 'restore',
        id: contact.id,
        etag: f.read().etag,
        reviewId: result.reviewId,
      },
      f.env,
      'reviewer'
    );
    const restored = f.read();
    assert.equal(restored.name, contact.name);
    assert.deepEqual(restored.animals, contact.animals);
    assert.equal(restored.identity, undefined);
    assert.equal(
      f.sqlite.prepare('SELECT count(*) AS n FROM contact_animals').get()!.n,
      0
    );
  } finally {
    f.sqlite.close();
  }
});

test('invalid corrections, production and imports in progress perform no partial writes', async () => {
  const f = fixture();
  try {
    await assert.rejects(
      reviewIdentity(
        { ...input, animals: [{ id: 'x', name: '', source: 'manual' }] },
        f.env,
        'reviewer'
      ),
      { code: 'invalid_identity' }
    );
    await assert.rejects(
      reviewIdentity(
        input,
        { ...f.env, APP_ENVIRONMENT: 'production' },
        'reviewer'
      ),
      { code: 'identity_preview_only' }
    );
    f.sqlite.exec("UPDATE preview_state SET import_id='importing'");
    await assert.rejects(reviewIdentity(input, f.env, 'reviewer'), {
      code: 'contact_changed',
    });
    assert.deepEqual(f.read(), contact);
    assert.equal((await identityHistory(contact.id, f.env)).history.length, 0);
  } finally {
    f.sqlite.close();
  }
});

test('identity API checks Access and same-origin and cannot call Google in preview', async () => {
  const f = fixture();
  let calls = 0;
  try {
    const origin = 'https://osteo-backoffice-preview.lvantours.workers.dev';
    const env = {
      ...f.env,
      APP_ORIGIN: origin,
      ACCESS_TEAM_DOMAIN: 'https://fictitious.cloudflareaccess.com',
      ACCESS_AUD: 'a'.repeat(64),
      GOOGLE_CONTACTS: {
        fetch() {
          calls++;
          throw new Error('must not call Google');
        },
      },
    } as Env;
    const unauthenticated = createPreviewHandler(async () => {
      throw new AccessError(401, 'access_required');
    });
    const unauthorized = await unauthenticated(
      new Request(origin + '/api/contact-identity?id=people/test'),
      env
    );
    assert.equal(unauthorized.status, 401);
    const handler = createPreviewHandler(async () => ({
      email: CONTACTS_ACCOUNT_EMAIL,
      name: 'Test',
    }));
    const denied = await handler(
      new Request(origin + '/api/contact-identity', {
        method: 'POST',
        headers: {
          Origin: 'https://other.invalid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }),
      env
    );
    assert.equal(denied.status, 403);
    const accepted = await handler(
      new Request(origin + '/api/contact-identity', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
      env
    );
    assert.equal(accepted.status, 200);
    assert.equal(calls, 0);
    const page = await handler(new Request(origin + '/api/contacts'), env);
    const data = (await page.json()) as { contacts: GoogleContact[] };
    assert.equal(data.contacts[0]!.identity!.originalName, contact.name);
  } finally {
    f.sqlite.close();
  }
});

test('local corrections persist across server transports without modifying imported data', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'identity-test-'));
  try {
    const data = {
      snapshotId: 'snapshot',
      contacts: [contact],
      labels: [],
      lists: [],
      memberships: [],
    };
    const path = pathToFileURL(join(dir, 'local.sqlite'));
    const transport = createLocalTransport(data, path);
    await transport('/api/contact-identity', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    const restarted = createLocalTransport(data, path);
    const page = await restarted('/api/contacts');
    assert.equal(page.contacts[0].name, 'Camille Martin');
    assert.equal(data.contacts[0]!.name, contact.name);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a registry failure rolls back the name and journal, and concurrent reviews cannot both win', async () => {
  const f = fixture();
  try {
    f.sqlite.exec(
      "CREATE TRIGGER reject_animal BEFORE INSERT ON contact_animals BEGIN SELECT RAISE(ABORT, 'simulated_storage_failure'); END;"
    );
    await assert.rejects(
      reviewIdentity(input, f.env, 'reviewer'),
      /simulated_storage_failure/
    );
    assert.deepEqual(f.read(), contact);
    assert.equal((await identityHistory(contact.id, f.env)).history.length, 0);
    f.sqlite.exec('DROP TRIGGER reject_animal');
    const attempts = await Promise.allSettled([
      reviewIdentity(input, f.env, 'reviewer-one'),
      reviewIdentity({ ...input, givenName: 'Autre' }, f.env, 'reviewer-two'),
    ]);
    assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
    assert.equal((await identityHistory(contact.id, f.env)).history.length, 1);
  } finally {
    f.sqlite.close();
  }
});

test('preview export carries corrected animals and undo history into a fresh local database', async () => {
  const f = fixture();
  const directory = await mkdtemp(join(tmpdir(), 'identity-export-'));
  try {
    const applied = await reviewIdentity(input, f.env, 'reviewer');
    const data = snapshotFromRows(f.sqlite.prepare(previewSnapshotQuery).all());
    const local = createLocalTransport(
      data,
      pathToFileURL(join(directory, 'copy.sqlite'))
    );
    const page = await local('/api/contacts');
    assert.equal(page.contacts[0].name, 'Camille Martin');
    assert.equal(
      page.contacts[0].identity.animals[0].id,
      f.read().identity!.animals[0]!.id
    );
    const journal = await local('/api/contact-identity?id=people/test');
    assert.equal(journal.history.length, 1);
    await local('/api/contact-identity', {
      method: 'POST',
      body: JSON.stringify({
        action: 'restore',
        id: contact.id,
        etag: page.contacts[0].etag,
        reviewId: applied.reviewId,
      }),
    });
    const restored = await local('/api/contacts');
    // Undo restores the source; the presentation still follows automatic policy.
    assert.equal(restored.contacts[0].name, 'Martin Camille');
    assert.equal(restored.contacts[0].givenName, '');
    assert.deepEqual(restored.contacts[0].animals, ['Luna']);
    const restoredJournal = await local('/api/contact-identity?id=people/test');
    assert.equal(restoredJournal.history[0].after.name, contact.name);
    assert.equal(f.read().name, 'Camille Martin');
  } finally {
    f.sqlite.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('automatic policy uses full unstructured family name and extracts distinct animals without altering coordinates', async () => {
  const { automaticIdentity } = await import('../src/contact-identity.ts');
  const { normalizeIdentities } = await import('../src/identity-review.ts');
  const correction = automaticIdentity(contact)!;
  assert.equal(correction.givenName, '');
  assert.equal(correction.familyName, 'Martin Camille');
  assert.deepEqual(
    correction.animals.map((a) => a.name),
    ['Luna']
  );
  assert.deepEqual(
    automaticIdentity({
      ...contact,
      name: 'Martin (Luna / Moka)',
      givenName: 'Martin (Luna / Moka)',
      animals: ['Luna'],
    })!.animals.map((a) => a.name),
    ['Luna', 'Moka']
  );
  const f = fixture();
  try {
    const result = await normalizeIdentities({}, f.env, 'automatic-test');
    assert.equal(result.changed, 1);
    assert.equal(result.done, true);
    assert.deepEqual(f.read().phones, contact.phones);
    assert.deepEqual(f.read().emails, contact.emails);
    assert.equal(f.read().name, 'Martin Camille');
    assert.equal(
      (await normalizeIdentities({}, f.env, 'automatic-test')).changed,
      0
    );
    assert.equal((await identityHistory(contact.id, f.env)).history.length, 1);
    await assert.rejects(
      normalizeIdentities(
        {},
        { ...f.env, APP_ENVIRONMENT: 'production' },
        'test'
      ),
      { code: 'identity_preview_only' }
    );
    await assert.rejects(
      normalizeIdentities({ snapshot: 'stale' }, f.env, 'test'),
      { code: 'contact_snapshot_changed' }
    );
  } finally {
    f.sqlite.close();
  }
});

test('automatic normalization preserves compound names and paginates the entire snapshot', async () => {
  const { automaticIdentity } = await import('../src/contact-identity.ts');
  const { normalizeIdentities } = await import('../src/identity-review.ts');
  const structured = automaticIdentity({
    ...contact,
    name: 'Jean-Pierre de La Tour (Romy Bella)',
    givenName: 'Jean-Pierre',
    familyName: 'de La Tour (Romy Bella)',
  })!;
  assert.equal(structured.givenName, 'Jean-Pierre');
  assert.equal(structured.familyName, 'De La Tour');
  assert.deepEqual(
    structured.animals.map((a) => a.name),
    ['Romy Bella']
  );
  const f = fixture();
  try {
    for (let i = 0; i < 24; i++) {
      const c = { ...contact, id: `people/page${i}` };
      f.sqlite
        .prepare('INSERT INTO copied_contacts VALUES (?,?,?,?)')
        .run('snapshot', c.id, c.etag, JSON.stringify(c));
    }
    let cursor = '';
    let snapshot: string | undefined;
    let total = 0;
    let pages = 0;
    for (;;) {
      const result = await normalizeIdentities(
        { cursor, snapshot },
        f.env,
        'automatic-test'
      );
      total += result.changed;
      pages++;
      if (result.done) break;
      cursor = result.cursor;
      snapshot = result.snapshot;
    }
    assert.equal(total, 25);
    assert.equal(pages, 3);
    assert.equal(
      f.sqlite.prepare('SELECT count(*) AS n FROM identity_reviews').get()!.n,
      25
    );
  } finally {
    f.sqlite.close();
  }
});
