import test from 'node:test';
import assert from 'node:assert/strict';
import { database } from './fixtures/database.ts';
import { normalizeIncomingContacts } from '../src/incoming-contacts.ts';
import { saveContactAnimals } from '../src/contact-animals.ts';
import type { GoogleContact } from '../src/contact-types.ts';
import type { Env } from '../src/config.ts';
const raw: GoogleContact = {
  id: 'people/fake',
  etag: 'v1',
  name: 'Martin (Luna)',
  givenName: 'Martin (Luna)',
  familyName: '',
  animals: ['Moka'],
  emails: [],
  phones: [],
  labelIds: [],
  lastAppointment: null,
};
test('animal edits persist, remove old upstream names and reject concurrent edits independently of Google', async () => {
  const f = database();
  const env = { DB: f.db } as Env;
  try {
    const [initial] = await normalizeIncomingContacts([raw], f.db);
    assert.equal(initial!.animalsVersion, '');
    const saved = await saveContactAnimals(
      { id: raw.id, version: '', animals: ['nala', 'Nala'] },
      env
    );
    const [next] = await normalizeIncomingContacts([raw], f.db);
    assert.deepEqual(next!.animals, ['Nala']);
    assert.equal(next!.animalsVersion, saved.version);
    assert.deepEqual(next!.emails, raw.emails);
    assert.equal(next!.etag, raw.etag);
    await assert.rejects(
      saveContactAnimals({ id: raw.id, version: '', animals: ['Luna'] }, env),
      { code: 'contact_changed' }
    );
    await saveContactAnimals(
      { id: raw.id, version: saved.version, animals: [] },
      env
    );
    assert.deepEqual(
      (await normalizeIncomingContacts([raw], f.db))[0]!.animals,
      []
    );
    await assert.rejects(
      saveContactAnimals({ id: raw.id, version: '', animals: ['\n'] }, env),
      { code: 'invalid_animals' }
    );
  } finally {
    f.sqlite.close();
  }
});
