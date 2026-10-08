import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ContactInteraction,
  GoogleContact,
} from '../src/contact-types.ts';
import {
  appointmentsForDay,
  buildAgenda,
  monthDays,
  nextAppointment,
  parisDay,
  shiftDay,
  shiftMonth,
} from '../src/browser/agenda-model.ts';

function appointment(
  id: string,
  date: string,
  changes: Partial<ContactInteraction> = {}
): ContactInteraction {
  return {
    id,
    type: 'appointment',
    date,
    animal: '',
    status: 'active',
    ...changes,
  };
}

function contact(id: string, history?: ContactInteraction[]): GoogleContact {
  return {
    id,
    name: 'Client fictif',
    givenName: 'Client',
    familyName: 'fictif',
    etag: 'fixture',
    emails: [],
    phones: [],
    labelIds: [],
    animals: ['Animal sans lien avec ce rendez-vous'],
    lastAppointment: null,
    history,
  };
}

test('the briefing retains every booking, sorts by instant and excludes canceled or invalid events', () => {
  const client = contact('people/fixture', [
    appointment('later', '2026-10-08T14:00:00Z', { animal: ' Nala ' }),
    appointment('past', '2026-10-07T08:00:00Z'),
    appointment('morning', '2026-10-08T08:00:00Z'),
    appointment('canceled', '2026-10-08T09:00:00Z', { status: 'canceled' }),
    appointment('invalid', 'not-a-date'),
    appointment('impossible', '2026-02-30T09:00:00Z'),
    appointment('zone-less', '2026-10-08T10:00:00'),
    appointment('day-only', '2026-10-08'),
  ]);
  const { appointments } = buildAgenda([client]);
  assert.deepEqual(
    appointments.map(({ id }) => id),
    ['past', 'morning', 'later']
  );
  assert.equal(appointments[1]!.animal, '');
  assert.equal(appointments[2]!.animal, 'Nala');
  assert.equal(appointments[1]!.contact, client);
  assert.deepEqual(
    appointmentsForDay(appointments, '2026-10-08').map(({ id }) => id),
    ['morning', 'later']
  );
  assert.equal(
    nextAppointment(appointments, Date.parse('2026-10-08T08:00:00Z'))?.id,
    'morning'
  );
  assert.equal(
    nextAppointment(appointments, Date.parse('2026-10-08T08:00:01Z'))?.id,
    'later'
  );
  assert.equal(
    nextAppointment(appointments, Date.parse('2026-10-09T00:00:00Z')),
    undefined
  );
});

test('a global booking ID is counted once across contacts while distinct bookings at the same time remain', () => {
  const uri = 'https://api.calendly.com/scheduled_events/fixture/invitees/one';
  const event = appointment(uri, '2026-10-08T08:00:00Z');
  const first = contact('people/one', [event, event]);
  const second = contact('people/two', [
    event,
    { ...event, id: `${uri}-other` },
  ]);
  const { appointments } = buildAgenda([first, second]);
  assert.equal(appointments.length, 2);
  assert.deepEqual(
    appointments[0]!.contacts.map(({ id }) => id),
    ['people/one', 'people/two']
  );
  assert.equal(appointments[0]!.contact, first);
  assert.deepEqual(first.history, [event, event]);
  assert.deepEqual(second.history, [event, { ...event, id: `${uri}-other` }]);
});

test('a cancellation suppresses a stale active copy regardless of contact order', () => {
  const event = appointment('booking', '2026-10-08T08:00:00Z');
  const active = contact('people/active', [event]);
  const canceled = contact('people/canceled', [
    { ...event, status: 'canceled' },
  ]);
  assert.deepEqual(buildAgenda([active, canceled]).appointments, []);
  assert.deepEqual(buildAgenda([canceled, active]).appointments, []);
});

test('missing history is distinguishable from a successfully loaded empty agenda', () => {
  assert.equal(buildAgenda([]).coverage, 'complete');
  assert.equal(buildAgenda([contact('people/empty', [])]).coverage, 'complete');
  assert.equal(
    buildAgenda([contact('people/missing')]).coverage,
    'unavailable'
  );
  const partial = buildAgenda([
    contact('people/empty', []),
    contact('people/missing'),
  ]);
  assert.equal(partial.coverage, 'partial');
  assert.equal(partial.contactsWithHistory, 1);
  assert.equal(partial.totalContacts, 2);
});

test('Paris day selection handles midnight, year changes, and both daylight-saving transitions', () => {
  assert.equal(parisDay('2026-10-07T22:30:00Z'), '2026-10-08');
  assert.equal(parisDay('2026-12-31T23:30:00Z'), '2027-01-01');
  assert.equal(parisDay('2026-03-29T00:30:00Z'), '2026-03-29');
  assert.equal(parisDay('2026-03-29T01:30:00Z'), '2026-03-29');
  assert.equal(parisDay('2026-10-25T00:30:00Z'), '2026-10-25');
  assert.equal(parisDay('2026-10-25T01:30:00Z'), '2026-10-25');
  const { appointments } = buildAgenda([
    contact('people/fixture', [
      appointment('early', '2026-10-25T02:30:00+02:00'),
      appointment('late', '2026-10-25T02:30:00+01:00'),
      appointment('midnight', '2026-10-24T22:30:00Z'),
    ]),
  ]);
  assert.deepEqual(
    appointmentsForDay(appointments, '2026-10-25').map(({ id }) => id),
    ['midnight', 'early', 'late']
  );
  assert.equal(
    appointments[2]!.startsAt - appointments[1]!.startsAt,
    60 * 60 * 1000
  );
});

test('month grids start on Monday, include leap day and keep complete weeks across year boundaries', () => {
  const february = monthDays('2028-02-15');
  assert.equal(february.length, 42);
  assert.deepEqual(february[0], { day: '2028-01-31', inMonth: false });
  assert.equal(february.filter(({ inMonth }) => inMonth).length, 29);
  assert.ok(
    february.some(({ day, inMonth }) => day === '2028-02-29' && inMonth)
  );
  assert.equal(new Date(`${february.at(-1)!.day}T12:00:00Z`).getUTCDay(), 0);
  const december = monthDays('2026-12-31');
  assert.equal(december[0]!.day, '2026-11-30');
  assert.equal(december.at(-1)!.day, '2027-01-10');
  const mondayStart = monthDays('2026-06-20');
  assert.deepEqual(mondayStart[0], { day: '2026-06-01', inMonth: true });
});

test('calendar navigation never skips February or repeats a day at a daylight-saving boundary', () => {
  assert.equal(shiftMonth('2026-01-31', 1), '2026-02-01');
  assert.equal(shiftMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftMonth('2027-01-01', -1), '2026-12-01');
  assert.equal(shiftDay('2026-03-28', 1), '2026-03-29');
  assert.equal(shiftDay('2026-03-29', 1), '2026-03-30');
  assert.equal(shiftDay('2026-10-25', 1), '2026-10-26');
  assert.equal(shiftDay('2028-03-01', -1), '2028-02-29');
  assert.throws(() => monthDays('2026-02-30'), RangeError);
});

test('mixed calendars merge exact Calendly mirrors, preserve distinct visits and require evidence for venue', () => {
  const first = {
    ...contact('people/first', [
      appointment('booking', '2026-10-08T09:00:00Z', { animal: 'Oslo' }),
    ]),
    emails: ['client@example.test'],
  };
  const other = {
    ...contact('people/other', []),
    emails: ['other@example.test'],
  };
  const calendarEvent = (
    id: string,
    title: string,
    emails: string[] = []
  ): import('../src/calendar-types.ts').CalendarAppointment => ({
    id,
    title,
    startsAt: '2026-10-08T09:00:00+00:00',
    endsAt: '2026-10-08T10:00:00Z',
    location: null,
    url: null,
    status: 'confirmed',
    attendeeEmails: emails,
  });
  const result = buildAgenda(
    [first, other],
    [
      calendarEvent('mirror', 'Consultation', ['CLIENT@example.test']),
      calendarEvent('home', 'Visite à domicile', ['other@example.test']),
      calendarEvent('unknown', 'Consultation'),
      calendarEvent('another', 'Visite à domicile', ['other@example.test']),
      calendarEvent('practice', 'Consultation au cabinet'),
      calendarEvent('conflicting', 'Cabinet / domicile à confirmer'),
    ]
  ).appointments;
  assert.equal(result.length, 6);
  const booking = result.find((event) => event.id === 'booking')!;
  assert.equal(booking.calendar?.id, 'mirror');
  assert.equal(booking.venue, 'practice');
  assert.equal(booking.animal, 'Oslo');
  assert.equal(
    result.find((event) => event.id === 'calendar:home')!.venue,
    'home'
  );
  assert.equal(
    result.find((event) => event.id === 'calendar:practice')!.venue,
    'practice'
  );
  const unknown = result.find((event) => event.id === 'calendar:unknown')!;
  assert.equal(unknown.venue, undefined);
  assert.equal(unknown.contact, null);
  assert.equal(unknown.animal, '');
  assert.equal(
    result.find((event) => event.id === 'calendar:conflicting')!.venue,
    undefined
  );
});

test('a shared time or ambiguous contact matches never collapses distinct Calendly bookings', () => {
  const owner = {
    ...contact('people/shared', [
      appointment('a', '2026-10-08T09:00:00Z'),
      appointment('b', '2026-10-08T09:00:00Z'),
    ]),
    emails: ['owner@example.test'],
  };
  const calendar: import('../src/calendar-types.ts').CalendarAppointment = {
    id: 'event',
    title: 'Consultation',
    startsAt: '2026-10-08T09:00:00Z',
    endsAt: '2026-10-08T10:00:00Z',
    location: null,
    url: null,
    status: 'confirmed',
    attendeeEmails: ['owner@example.test'],
  };
  assert.equal(buildAgenda([owner], [calendar]).appointments.length, 3);
});
