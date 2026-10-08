import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoData,
  createDemoTransport,
} from '../scripts/preview-data.mjs';

const parisDay = (date: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));

test('fictitious agenda includes a past visit, two upcoming visits and a cancellation today', async () => {
  const now = new Date('2026-10-08T08:15:00Z');
  const data = createDemoData(now);
  const events = data.contacts.flatMap((contact) => contact.history);
  const today = events.filter(
    (event) => parisDay(event.date) === parisDay(now)
  );
  assert.equal(today.filter((event) => event.status === 'canceled').length, 1);
  assert.equal(
    today.filter(
      (event) => event.status === 'active' && Date.parse(event.date) < +now
    ).length,
    1
  );
  assert.equal(
    today.filter(
      (event) => event.status === 'active' && Date.parse(event.date) > +now
    ).length,
    2
  );
  assert.ok(events.some((event) => parisDay(event.date) === '2026-11-12'));
  const firstPage = await createDemoTransport(data)('/api/contacts');
  assert.ok('contacts' in firstPage);
  assert.deepEqual(firstPage.contacts[2].history, data.contacts[2]!.history);
  assert.ok(
    data.contacts.every(
      (contact) =>
        !contact.lastAppointment || Date.parse(contact.lastAppointment) <= +now
    )
  );
});

test('demo appointments follow the Paris day and retain local hours across winter time', () => {
  const midnight = createDemoData(new Date('2026-10-08T22:10:00Z'));
  const firstVisit = midnight.contacts[1]!.history.at(-1)!;
  assert.equal(parisDay(firstVisit.date), '2026-10-09');
  assert.equal(firstVisit.date, '2026-10-08T22:00:00.000Z');

  const autumn = createDemoData(new Date('2026-10-24T08:15:00Z'));
  const tomorrow = autumn.contacts[6]!.history.at(-1)!;
  assert.equal(tomorrow.date, '2026-10-25T08:30:00.000Z');
});

test('late-night and year-end previews retain future appointments without moving past visits forward', () => {
  const now = new Date('2026-12-31T22:55:00Z');
  const data = createDemoData(now);
  for (const index of [2, 3]) {
    const nextVisit = data.contacts[index]!.history.at(-1)!;
    assert.equal(parisDay(nextVisit.date), '2027-01-01');
    assert.ok(Date.parse(nextVisit.date) > +now);
  }
  assert.equal(parisDay(data.contacts[12]!.history.at(-1)!.date), '2027-02-04');
});
