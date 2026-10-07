import assert from 'node:assert/strict';
import test from 'node:test';
import { extractManualNotes } from '../src/contact-sources.ts';
import { readGoogleContacts } from '../src/contacts-reader.ts';
import { BEGIN, END, renderBlock } from '../src/model.ts';
import { booking, database, environment, upstream } from './helpers.ts';
import type {
  ContactSources,
  ContactSourcesPage,
} from '../src/source-types.ts';

test('manual notes before and after the verified block retain their exact text', () => {
  const block = renderBlock([booking()]);
  const before = 'Préfère être appelée. Éviter le bruit.\n\n';
  const after = '\n\nNote ajoutée après Calendly : déjà deux animaux.';
  const result = extractManualNotes(
    { biographies: [{ value: before + block + after }] },
    { last_block: block, pending_block: null }
  );
  assert.equal(result.notesState, 'ready');
  assert.deepEqual(
    result.notes.map((note) => note.text),
    [before, after]
  );
  assert.doesNotMatch(JSON.stringify(result.notes), /Référence|Confirmé/);
  assert.equal(
    extractManualNotes(
      { biographies: [{ value: block }] },
      { last_block: null, pending_block: block }
    ).notesState,
    'ready'
  );
});

test('plain notes, empty notes and long unicode text are preserved without truncation', () => {
  const text = 'Éléphant, garçon 🐴. '.repeat(10000);
  assert.equal(
    extractManualNotes({ biographies: [{ value: text }] }).notes[0]!.text,
    text
  );
  assert.deepEqual(extractManualNotes({}).notes, []);
  assert.equal(
    extractManualNotes({ biographies: [{ value: 'Note personnelle' }] })
      .notesState,
    'ready'
  );
});

test('modified, deleted, unknown or ambiguous managed blocks require review', () => {
  const block = `${BEGIN}\noriginal\n${END}`;
  const tracked = { last_block: block, pending_block: null };
  for (const text of [
    'Note',
    BEGIN,
    END,
    `${END}${BEGIN}`,
    `${block}${block}`,
    block.replace('original', 'édité'),
  ]) {
    const result = extractManualNotes(
      { biographies: [{ value: text }] },
      tracked
    );
    assert.equal(result.notesState, 'review', text);
    assert.equal(result.notes[0]!.text, text);
  }
  assert.equal(
    extractManualNotes({ biographies: [{ value: block }] }).notesState,
    'review'
  );
  assert.equal(
    extractManualNotes({
      biographies: [{ value: '<p>Texte</p>', contentType: 'TEXT_HTML' }],
    }).notesState,
    'review'
  );
  assert.equal(
    extractManualNotes({ biographies: [{ value: 'A' }, { value: 'B' }] })
      .notesState,
    'review'
  );
});

test('private sources include structured bookings and notes for contacts with or without email', async () => {
  const t = database();
  const u = upstream();
  const b = booking();
  const block = renderBlock([b]);
  t.sqlite
    .prepare(
      'INSERT INTO contacts(email,marker,resource_name,last_block) VALUES (?,?,?,?)'
    )
    .run(b.email, 'fake-marker', 'people/1', block);
  t.sqlite
    .prepare('INSERT INTO bookings VALUES (?,?,?,?,?)')
    .run(b.uri, b.eventUri, b.email, JSON.stringify(b), b.updatedAt);
  u.people.set('people/1', {
    resourceName: 'people/1',
    biographies: [{ value: `Avant\n${block}\nAprès` }],
  });
  u.people.set('people/2', {
    resourceName: 'people/2',
    biographies: [{ value: 'Sans e-mail, chien Moka.' }],
  });
  const read = (path: string) =>
    readGoogleContacts(
      new Request(`https://contacts.internal${path}`, {
        headers: { 'X-Contacts-Account': 'owner@example.com' },
      }),
      environment(t.db),
      u.fetcher
    );
  const page = (await (await read('/sources')).json()) as ContactSourcesPage;
  assert.equal(page.contacts.length, 2);
  assert.equal(page.contacts[0]!.appointments[0]!.reason, b.reason);
  assert.equal(page.contacts[0]!.appointments[0]!.status, 'active');
  assert.equal(page.contacts[1]!.notes[0]!.text, 'Sans e-mail, chien Moka.');
  assert.doesNotMatch(JSON.stringify(page), /person@example|06 12|Camille/);
  const single = (await (await read('/source?id=people%2F1')).json()) as {
    contact: ContactSources;
  };
  assert.deepEqual(single.contact.appointments, page.contacts[0]!.appointments);
  assert.equal((await read('/source?id=people%2Fabsent')).status, 404);
  assert.equal((await read('/source?id=people%2F1&id=people%2F2')).status, 400);
  assert.equal((await read('/sources?unexpected=1')).status, 400);
  const wrongAccount = await readGoogleContacts(
    new Request('https://contacts.internal/sources', {
      headers: { 'X-Contacts-Account': 'another@example.com' },
    }),
    environment(t.db),
    u.fetcher
  );
  assert.equal(wrongAccount.status, 503);
  const publicRead = await readGoogleContacts(
    new Request('https://public.example/sources'),
    environment(t.db),
    u.fetcher
  );
  assert.equal(publicRead.status, 404);
  assert.ok(
    u.calls.every(
      (call) =>
        call.method === 'GET' || call.url.hostname === 'oauth2.googleapis.com'
    )
  );
  t.sqlite.close();
});

test('a D1 history failure cannot produce a successful empty sources response', async () => {
  const t = database();
  const u = upstream();
  u.people.set('people/1', {
    resourceName: 'people/1',
    biographies: [{ value: 'Private note' }],
  });
  t.sqlite.exec('DROP TABLE bookings');
  const response = await readGoogleContacts(
    new Request('https://contacts.internal/sources', {
      headers: { 'X-Contacts-Account': 'owner@example.com' },
    }),
    environment(t.db),
    u.fetcher
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /Private note|sqlite|DROP/);
  t.sqlite.close();
});
