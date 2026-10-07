import assert from 'node:assert/strict';
import test from 'node:test';
import { database } from './fixtures/database.ts';
import { contactsPage } from '../src/contacts.ts';
import { normalizeIncomingContacts } from '../src/incoming-contacts.ts';
import type { GoogleContact, ContactPage } from '../src/contact-types.ts';
import type { Env } from '../src/config.ts';

const raw: GoogleContact = {
  id: 'people/new',
  etag: 'source-version',
  name: 'Martin Camille (Romy Bella / Luna)',
  givenName: 'Martin Camille (Romy Bella / Luna)',
  familyName: '',
  emails: ['test@example.test'],
  phones: ['0600000000'],
  labelIds: [],
  animals: [],
  lastAppointment: null,
};

test('new arrivals normalize on their first read in every environment without a user action or upstream mutation', async () => {
  for (const APP_ENVIRONMENT of ['local', 'preview', 'production'] as const) {
    const f = database();
    const calls: Request[] = [];
    const env = {
      APP_ENVIRONMENT,
      DB: f.db,
      GOOGLE_CONTACTS: {
        async fetch(request: Request) {
          calls.push(request);
          return Response.json({
            contacts: [raw],
            nextPageToken: null,
            appointmentsAvailable: true,
          });
        },
      },
    } as Env;
    try {
      const page = (await contactsPage(
        new URL('https://example.test/api/contacts'),
        env
      )) as ContactPage;
      assert.equal(page.contacts[0]!.familyName, 'Martin Camille');
      assert.equal(page.contacts[0]!.givenName, '');
      assert.deepEqual(page.contacts[0]!.animals, ['Romy Bella', 'Luna']);
      assert.equal(page.contacts[0]!.etag, raw.etag);
      assert.deepEqual(page.contacts[0]!.emails, raw.emails);
      assert.deepEqual(page.contacts[0]!.phones, raw.phones);
      assert.deepEqual(
        calls.map((r) => r.method),
        ['GET']
      );
      assert.deepEqual(
        await normalizeIncomingContacts(page.contacts, f.db),
        page.contacts
      );
      assert.deepEqual(raw.animals, []);
      assert.equal(
        f.sqlite
          .prepare('SELECT count(*) AS n FROM known_contact_animals')
          .get()!.n,
        2
      );
      const edited = await normalizeIncomingContacts(
        [{ ...raw, name: 'Martin', givenName: '', familyName: 'Martin' }],
        f.db
      );
      assert.deepEqual(
        new Set(edited[0]!.animals),
        new Set(['Romy Bella', 'Luna'])
      );
    } finally {
      f.sqlite.close();
    }
  }
});

test('ingestion respects explicitly corrected animals and still normalizes a subsequent name edit', async () => {
  const f = database();
  try {
    await normalizeIncomingContacts([raw], f.db);
    const contact = {
      ...raw,
      name: 'Martin (Moka)',
      givenName: '',
      familyName: 'Martin (Moka)',
      identity: { originalName: raw.name, reviewId: 'test', animals: [] },
    };
    const [result] = await normalizeIncomingContacts([contact], f.db);
    assert.deepEqual(result!.animals, ['Moka']);
    assert.equal(result!.name, 'Martin');
  } finally {
    f.sqlite.close();
  }
});

test('people and animal names start with uppercase letters without lowercasing existing spelling', async () => {
  const [result] = await normalizeIncomingContacts([
    {
      ...raw,
      name: 'élodie dupont (romy bella)',
      givenName: 'élodie',
      familyName: 'dupont (romy bella)',
    },
  ]);
  assert.equal(result!.givenName, 'Élodie');
  assert.equal(result!.familyName, 'Dupont');
  assert.deepEqual(result!.animals, ['Romy Bella']);
});

test('nested or incomplete annotations stay intact and copied reads do not add animals', async () => {
  for (const name of ['Martin (Moka (Chien))', 'Martin (Moka (Chien)']) {
    const f = database();
    try {
      const [first] = await normalizeIncomingContacts(
        [{ ...raw, name, givenName: '', familyName: name, animals: ['Luna'] }],
        f.db
      );
      assert.equal(first!.name, name);
      assert.deepEqual(first!.animals, ['Luna']);
      const before = f.sqlite
        .prepare('SELECT * FROM known_contact_animals ORDER BY animal_key')
        .all();
      assert.deepEqual(await normalizeIncomingContacts([first!], f.db), [
        first,
      ]);
      assert.deepEqual(
        f.sqlite
          .prepare('SELECT * FROM known_contact_animals ORDER BY animal_key')
          .all(),
        before
      );
    } finally {
      f.sqlite.close();
    }
  }
});
