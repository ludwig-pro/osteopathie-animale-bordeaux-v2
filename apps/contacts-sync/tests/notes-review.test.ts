import test from 'node:test';
import assert from 'node:assert/strict';
import { database, environment, upstream, booking } from './helpers.ts';
import { enqueue, saveBooking } from '../src/store.ts';
import { run } from '../src/runner.ts';
import { BEGIN, MARKER, renderBlock } from '../src/model.ts';
import { notesReview } from '../src/notes-review.ts';
import type { Contact } from '../src/types.ts';

async function setup() {
  const t = database(),
    remote = upstream(),
    env = environment(t.db);
  t.sqlite
    .prepare(
      "UPDATE settings SET mode='live',next_scan=?,google_group='contactGroups/calendly'"
    )
    .run(Date.now() + 86400000);
  const original = 'Note personnelle\nÀ conserver intégralement.';
  remote.people.set('people/manual', {
    resourceName: 'people/manual',
    names: [{ givenName: 'Nom personnel' }],
    emailAddresses: [{ value: 'person@example.com' }],
    biographies: [{ value: original }],
    metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
  });
  await saveBooking(t.db, booking());
  t.sqlite
    .prepare(
      "UPDATE contacts SET resource_name='people/manual',pending_block=?"
    )
    .run(renderBlock([booking()]));
  const action = (value: string) =>
    t.sqlite
      .prepare(
        "UPDATE jobs SET payload=json_set(payload,'$.notesAction',?),state='pending',due_at=0,version=version+1"
      )
      .run(value);
  return { ...t, ...remote, env, original, action };
}

test('private inspection emits technical flags without writing Google or copying notes', async () => {
  const t = await setup();
  t.action('inspect');
  await run(t.env, t.fetcher);
  const stored = String(
    t.sqlite.prepare('SELECT notes_review FROM contacts').get()!.notes_review
  );
  const diagnostic = JSON.parse(stored);
  assert.equal(diagnostic.can_recover_unconfirmed, true);
  assert.equal(diagnostic.has_pending_block, true);
  assert.equal(diagnostic.has_google_marker, false);
  assert.doesNotMatch(
    stored,
    /person@|Note personnelle|conserver|Nom personnel/
  );
  assert.equal(
    t.calls.filter(
      (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
    ).length,
    0
  );
  const job = t.sqlite
    .prepare('SELECT state,error_code,payload FROM jobs')
    .get()!;
  assert.equal(job.state, 'conflict');
  assert.equal(job.error_code, 'notes_review_required');
  assert.equal(JSON.parse(String(job.payload)).notesAction, undefined);
});

test('authorized recovery of an unconfirmed intent preserves all current notes and stays idempotent', async () => {
  const t = await setup();
  t.action('recover-unconfirmed');
  await run(t.env, t.fetcher);
  const person = t.people.get('people/manual')!;
  assert.equal(person.names![0]!.givenName, 'Nom personnel');
  assert.ok(person.biographies![0]!.value.startsWith(t.original + '\n\n'));
  assert.equal(person.biographies![0]!.value.split(BEGIN).length, 2);
  assert.equal(t.behavior.createCalls, 0);
  assert.equal(
    t.sqlite.prepare('SELECT pending_block FROM contacts').get()!.pending_block,
    null
  );
  assert.equal(t.sqlite.prepare('SELECT state FROM jobs').get()!.state, 'done');
  const notes = person.biographies![0]!.value;
  await enqueue(t.db, 'contact', 'person@example.com', {
    email: 'person@example.com',
  }).run();
  await run(t.env, t.fetcher);
  assert.equal(t.people.get('people/manual')!.biographies![0]!.value, notes);
  assert.equal(t.calls.filter((c) => c.method === 'PATCH').length, 1);
  assert.equal(
    t.sqlite.prepare('SELECT outcome FROM contacts').get()!.outcome,
    'unchanged'
  );
});

test('a change after inspection is freshly checked and cannot be overwritten by recovery', async () => {
  const t = await setup();
  t.action('inspect');
  await run(t.env, t.fetcher);
  const modified = renderBlock([booking()]).replace(
    'Oslo',
    'Modification humaine'
  );
  t.people.get('people/manual')!.biographies = [
    { value: t.original + '\n' + modified },
  ];
  t.action('recover-unconfirmed');
  await run(t.env, t.fetcher);
  assert.equal(
    t.sqlite.prepare('SELECT error_code FROM jobs').get()!.error_code,
    'notes_resolution_requires_review'
  );
  assert.equal(
    t.calls.filter(
      (c) => c.url.hostname === 'people.googleapis.com' && c.method !== 'GET'
    ).length,
    0
  );
  assert.equal(
    t.people.get('people/manual')!.biographies![0]!.value,
    t.original + '\n' + modified
  );
});

test('recovery refuses confirmed notes, removed markers, partial blocks and unsupported formats', async () => {
  const t = await setup();
  const contact = t.sqlite
    .prepare('SELECT * FROM contacts')
    .get() as unknown as Contact;
  const person = t.people.get('people/manual')!;
  assert.equal(notesReview(person, contact).can_recover_unconfirmed, true);
  assert.equal(
    notesReview(person, { ...contact, last_block: contact.pending_block })
      .can_recover_unconfirmed,
    false
  );
  assert.equal(
    notesReview(person, { ...contact, synced_at: 123 }).can_recover_unconfirmed,
    false
  );
  for (const value of [contact.marker, 'different-marker'])
    assert.equal(
      notesReview({ ...person, userDefined: [{ key: MARKER, value }] }, contact)
        .can_recover_unconfirmed,
      false
    );
  assert.equal(
    notesReview(
      { ...person, biographies: [{ value: BEGIN + '\ntexte' }] },
      contact
    ).can_recover_unconfirmed,
    false
  );
  assert.equal(
    notesReview(
      {
        ...person,
        biographies: [{ value: '<p>texte</p>', contentType: 'TEXT_HTML' }],
      },
      contact
    ).can_recover_unconfirmed,
    false
  );
});
