import test from 'node:test';
import assert from 'node:assert/strict';
import { booking } from './helpers.ts';
import {
  bookingFrom,
  mergeNotes,
  mergePerson,
  normalizeEmail,
  renderBlock,
  BEGIN,
} from '../src/model.ts';
import type { Contact } from '../src/types.ts';
const contact: Contact = {
  email: 'person@example.com',
  marker: 'marker-1',
  resource_name: null,
  last_block: null,
  pending_block: null,
  creation_attempted: 0,
  pilot_allowed: 0,
  synced_at: null,
};

test('email identity preserves plus tags and dots', () => {
  assert.equal(
    normalizeEmail(' Person.Test+dog@Example.COM '),
    'person.test+dog@example.com'
  );
});
test('merge preserves manual name, phones, labels, custom fields and notes across multiple animals', () => {
  const result = mergePerson(
    {
      names: [{ givenName: 'Nom manuel' }],
      phoneNumbers: [{ value: '+33612345678' }],
      biographies: [{ value: 'Note manuelle' }],
      memberships: [
        {
          contactGroupMembership: {
            contactGroupResourceName: 'contactGroups/family',
          },
        },
      ],
      userDefined: [{ key: 'manual', value: 'keep' }],
    },
    contact,
    [
      booking(),
      booking('second', {
        animal: 'Moka',
        phone: '07 12 34 56 78',
        start: '2025-02-02T10:00:00Z',
      }),
    ],
    'contactGroups/calendly'
  );
  assert.equal(result.person.names?.[0]?.givenName, 'Nom manuel');
  assert.equal(result.person.phoneNumbers?.length, 2);
  assert.equal(result.person.memberships?.length, 2);
  assert.equal(result.person.userDefined?.[0]?.key, 'manual');
  assert.match(result.person.biographies![0]!.value, /^Note manuelle\n\n/);
  assert.match(result.block, /Oslo/);
  assert.match(result.block, /Moka/);
  const again = mergePerson(
    result.person,
    { ...contact, last_block: result.block },
    [
      booking(),
      booking('second', {
        animal: 'Moka',
        phone: '07 12 34 56 78',
        start: '2025-02-02T10:00:00Z',
      }),
    ],
    'contactGroups/calendly'
  );
  assert.deepEqual(again.fields, []);
});
test('notes merge retains text before and after managed block, cancellation only changes that block', () => {
  const old = renderBlock([booking()]),
    updated = renderBlock([booking('invitee-1', { status: 'canceled' })]);
  assert.equal(
    mergeNotes(`avant\n${old}\naprès`, updated, {
      last_block: old,
      pending_block: null,
    }),
    `avant\n${updated}\naprès`
  );
});
test('manual edits, removed markers, duplicate markers and oversized notes block writes', () => {
  const old = renderBlock([booking()]);
  for (const notes of [
    old.replace('Oslo', 'Correction'),
    'Manual only',
    old + '\n' + old,
  ])
    assert.throws(
      () => mergeNotes(notes, old, { last_block: old, pending_block: null }),
      /notes_manually_modified/
    );
  assert.throws(
    () =>
      mergeNotes('x'.repeat(16000), old, {
        last_block: null,
        pending_block: null,
      }),
    /notes_too_large/
  );
});
test('pending block recovers successful update whose response was lost', () => {
  const old = renderBlock([booking()]),
    pending = renderBlock([booking('invitee-1', { status: 'canceled' })]);
  assert.equal(
    mergeNotes('manual\n' + pending, pending, {
      last_block: old,
      pending_block: pending,
    }),
    'manual\n' + pending
  );
});
test('answers cannot inject managed delimiters', () => {
  const block = renderBlock([booking('invitee-1', { reason: BEGIN })]);
  assert.equal(block.split(BEGIN).length, 2);
});
test('custom phone question and curly apostrophe are mapped, canceled event overrides active invitee', () => {
  const b = bookingFrom(
    {
      uri: booking().uri,
      event: booking().eventUri,
      email: 'Person@Example.com',
      name: 'Camille',
      status: 'active',
      updated_at: '2025-01-01T00:00:00Z',
      questions_and_answers: [
        { question: 'Numéro de Téléphone ', answer: '06 12 34 56 78' },
        { question: 'Date de naissance de l’animal', answer: '2020' },
      ],
    },
    {
      uri: booking().eventUri,
      start_time: booking().start,
      status: 'canceled',
      updated_at: '2025-01-02T00:00:00Z',
      event_memberships: [],
    }
  );
  assert.equal(b.phone, '06 12 34 56 78');
  assert.equal(b.birth, '2020');
  assert.equal(b.status, 'canceled');
});
