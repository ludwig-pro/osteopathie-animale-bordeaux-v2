import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readNextAppointment,
  readCalendarAppointments,
} from '../src/google-calendar.ts';
import { readGoogleContacts } from '../src/contacts-reader.ts';
import worker from '../src/index.ts';
import { environment } from './helpers.ts';
import type { Fetcher } from '../src/types.ts';

const now = Date.parse('2026-10-25T00:15:00Z');
function event(id = 'next', startsAt = '2026-10-25T02:00:00+01:00') {
  return {
    id,
    status: 'confirmed',
    eventType: 'default',
    summary: 'Moka — consultation fictive',
    location: 'Cabinet fictif',
    htmlLink: 'https://www.google.com/calendar/event?eid=fictitious',
    start: { dateTime: startsAt },
    end: { dateTime: new Date(Date.parse(startsAt) + 3600000).toISOString() },
    description: 'private-note',
    attendees: [
      {
        self: true,
        responseStatus: 'accepted',
        email: 'private-email@example.test',
      },
    ],
  };
}
function fixture(
  pages: unknown[] = [{ kind: 'calendar#events', items: [event()] }]
) {
  const env = environment({} as D1Database);
  const calls: { url: URL; init?: RequestInit }[] = [];
  let page = 0;
  const fetcher: Fetcher = async (input, init) => {
    const url = new URL(input);
    calls.push({ url, init });
    if (url.hostname === 'oauth2.googleapis.com')
      return Response.json({ access_token: 'fake-calendar-token' });
    if (url.hostname === 'openidconnect.googleapis.com')
      return Response.json({
        sub: 'owner-id',
        email: env.EXPECTED_GOOGLE_EMAIL,
        email_verified: true,
      });
    assert.equal(url.hostname, 'www.googleapis.com');
    assert.equal(
      new Headers(init?.headers).get('Authorization'),
      'Bearer fake-calendar-token'
    );
    assert.equal(init?.method ?? 'GET', 'GET');
    const result = pages[page++];
    return result instanceof Response ? result : Response.json(result);
  };
  const request = (path = '/next-appointment', init: RequestInit = {}) =>
    new Request(`https://contacts.internal${path}`, {
      ...init,
      headers: {
        'X-Contacts-Account': env.EXPECTED_GOOGLE_EMAIL,
        ...init.headers,
      },
    });
  const read = () => readNextAppointment(request(), env, fetcher, now);
  return { env, calls, fetcher, request, read };
}

test('the calendar expands recurrence, selects the next timed appointment across DST and strips private fields', async () => {
  const f = fixture([
    {
      kind: 'calendar#events',
      items: [
        event('later', '2026-10-25T03:00:00+01:00'),
        event('ongoing', '2026-10-25T01:45:00+02:00'),
        {
          ...event('all-day'),
          start: { date: '2026-10-25' },
          end: { date: '2026-10-26' },
        },
        { ...event('canceled'), status: 'cancelled' },
        {
          ...event('declined'),
          attendees: [{ self: true, responseStatus: 'declined' }],
        },
        { ...event('focus'), eventType: 'focusTime' },
        {
          ...event('next', '2026-10-25T02:30:00+02:00'),
          status: 'tentative',
          recurringEventId: 'series',
        },
      ],
    },
  ]);
  const response = await f.read();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control')!, /no-store/);
  const data = (await response.json()) as {
    appointment: Record<string, unknown>;
    checkedAt: string;
  };
  assert.deepEqual(data.appointment, {
    id: 'next',
    title: 'Moka — consultation fictive',
    startsAt: '2026-10-25T00:30:00.000Z',
    endsAt: '2026-10-25T01:30:00.000Z',
    location: 'Cabinet fictif',
    url: 'https://www.google.com/calendar/event?eid=fictitious',
    status: 'tentative',
  });
  assert.equal(data.checkedAt, new Date(now).toISOString());
  assert.doesNotMatch(
    JSON.stringify(data),
    /private-note|private-email|fake-calendar-token/
  );
  const query = f.calls[2]!.url.searchParams;
  assert.equal(query.get('singleEvents'), 'true');
  assert.equal(query.get('orderBy'), 'startTime');
  assert.equal(query.get('timeMin'), new Date(now).toISOString());
  assert.equal(query.get('showDeleted'), 'false');
  assert.equal(query.get('eventTypes'), 'default');
  assert.equal(query.get('timeZone'), 'Europe/Paris');
  assert.doesNotMatch(query.get('fields')!, /description|email/);
  assert.equal(f.calls.length, 3);
});

test('empty pages resume pagination and a configured owned calendar stays on the Google API host', async () => {
  const f = fixture([
    { kind: 'calendar#events', nextPageToken: 'cursor&1', items: [] },
    { kind: 'calendar#events', items: [event()] },
  ]);
  f.env.GOOGLE_CALENDAR_ID = 'appointments@example.test';
  const data = (await (await f.read()).json()) as {
    appointment: { id: string };
  };
  assert.equal(data.appointment.id, 'next');
  assert.equal(f.calls[3]!.url.searchParams.get('pageToken'), 'cursor&1');
  assert.equal(
    f.calls[3]!.url.pathname,
    '/calendar/v3/calendars/appointments%40example.test/events'
  );
  const empty = fixture([{ kind: 'calendar#events' }]);
  assert.deepEqual(await (await empty.read()).json(), {
    appointment: null,
    checkedAt: new Date(now).toISOString(),
  });
});

test('a bounded incomplete scan and malformed calendar data cannot become an empty agenda', async () => {
  const incomplete = fixture(
    Array.from({ length: 3 }, (_, index) => ({
      kind: 'calendar#events',
      items: [],
      nextPageToken: `cursor${index}`,
    }))
  );
  const response = await incomplete.read();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'google_calendar_unavailable',
  });
  assert.equal(incomplete.calls.length, 5);
  for (const page of [
    {},
    { kind: 'calendar#events', items: 'private-invalid-value' },
    {
      kind: 'calendar#events',
      items: [{ ...event(), start: { dateTime: 'invalid' } }],
    },
    {
      kind: 'calendar#events',
      items: [{ ...event(), end: { dateTime: event().start.dateTime } }],
    },
    {
      kind: 'calendar#events',
      items: [{ ...event(), summary: 'a'.repeat(4097) }],
    },
    { kind: 'calendar#events', items: [], nextPageToken: 123 },
  ]) {
    const failed = await fixture([page]).read();
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), {
      error: 'google_calendar_unavailable',
    });
  }
});

test('calendar permissions, quotas, network errors and oversized responses remain safe unavailable states', async () => {
  for (const status of [401, 403, 429, 502]) {
    const response = await fixture([
      new Response('private-upstream-token', { status }),
    ]).read();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error:
        status <= 403
          ? 'google_calendar_authorization_required'
          : 'google_calendar_unavailable',
    });
  }
  for (const reason of [
    'userRateLimitExceeded',
    'rateLimitExceeded',
    'quotaExceeded',
  ]) {
    const response = await fixture([
      Response.json(
        { error: { errors: [{ reason, message: 'private-upstream-token' }] } },
        { status: 403 }
      ),
    ]).read();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'google_calendar_unavailable',
    });
  }
  const oversized = await fixture([
    new Response('x'.repeat(2 * 1024 * 1024 + 1)),
  ]).read();
  assert.equal(oversized.status, 503);
  const f = fixture();
  const network: Fetcher = (input, init) =>
    new URL(input).hostname === 'www.googleapis.com'
      ? Promise.reject(new Error('private-network-information'))
      : f.fetcher(input, init);
  const response = await readNextAppointment(f.request(), f.env, network, now);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'google_calendar_unavailable',
  });
});

test('private calendar reads require the pinned and verified account, reject parameters and never reach the public Worker', async () => {
  const f = fixture();
  for (const [request, status] of [
    [f.request('/next-appointment?calendarId=other'), 400],
    [f.request('/next-appointment', { method: 'POST' }), 405],
    [
      f.request('/next-appointment', {
        headers: { 'X-Contacts-Account': 'another@example.test' },
      }),
      503,
    ],
    [
      new Request('https://public.invalid/next-appointment', {
        headers: { 'X-Contacts-Account': f.env.EXPECTED_GOOGLE_EMAIL },
      }),
      404,
    ],
  ] as const)
    assert.equal(
      (await readGoogleContacts(request, f.env, f.fetcher)).status,
      status
    );
  assert.equal(f.calls.length, 0);
  assert.equal((await worker.fetch(f.request(), f.env)).status, 404);
  const mismatch: Fetcher = (input, init) =>
    new URL(input).hostname === 'openidconnect.googleapis.com'
      ? Promise.resolve(
          Response.json({
            sub: 'other',
            email: 'other@example.test',
            email_verified: true,
          })
        )
      : f.fetcher(input, init);
  const failed = await readGoogleContacts(f.request(), f.env, mismatch);
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), {
    error: 'google_connection_unavailable',
  });
  assert.equal(
    f.calls.some((call) => call.url.hostname === 'www.googleapis.com'),
    false
  );
});

test('unsafe calendar links are removed and invalid configured calendar IDs do no IO', async () => {
  for (const link of [
    'javascript:alert(1)',
    'https://other.example.test/calendar/event',
    'https://www.google.com.evil.test/calendar/event',
    'https://user@calendar.google.com/calendar/event',
  ]) {
    const data = (await (
      await fixture([
        { kind: 'calendar#events', items: [{ ...event(), htmlLink: link }] },
      ]).read()
    ).json()) as { appointment: { url: string | null } };
    assert.equal(data.appointment.url, null);
  }
  const f = fixture();
  f.env.GOOGLE_CALENDAR_ID = '//other.example.test/path';
  assert.equal((await f.read()).status, 503);
  assert.equal(f.calls.length, 0);
});

test('the full window retains past visits and matches contacts using only useful attendee emails', async () => {
  const f = fixture([
    {
      kind: 'calendar#events',
      items: [
        event('past', '2026-10-25T00:05:00Z'),
        {
          ...event('home'),
          attendees: [
            {
              self: true,
              responseStatus: 'accepted',
              email: 'owner@example.test',
            },
            { email: 'CLIENT@example.test', responseStatus: 'accepted' },
            { email: 'declined@example.test', responseStatus: 'declined' },
          ],
        },
        { ...event('canceled'), status: 'cancelled' },
        { ...event('all-day'), start: { date: '2026-10-25' } },
        {
          ...event('declined'),
          attendees: [{ self: true, responseStatus: 'declined' }],
        },
        event('outside', '2026-10-26T09:00:00Z'),
      ],
    },
  ]);
  const response = await readCalendarAppointments(
    f.request('/calendar-appointments?from=2026-10-25&to=2026-10-26'),
    f.env,
    f.fetcher,
    now
  );
  assert.equal(response.status, 200);
  const data = (await response.json()) as {
    appointments: { id: string; attendeeEmails: string[] }[];
  };
  assert.deepEqual(
    data.appointments.map((event) => event.id),
    ['past', 'home']
  );
  assert.deepEqual(data.appointments[1]!.attendeeEmails, [
    'client@example.test',
  ]);
  assert.doesNotMatch(
    JSON.stringify(data),
    /private-note|owner@example|declined@example|fake-calendar-token/
  );
  const query = f.calls[2]!.url.searchParams;
  assert.equal(query.get('timeMin'), '2026-10-25T00:00:00Z');
  assert.equal(query.get('timeMax'), '2026-10-26T00:00:00Z');
  assert.equal(query.has('maxAttendees'), false);
  assert.doesNotMatch(query.get('fields')!, /description/);
});

test('window parameters, incomplete scans, permissions and pinned account fail safely', async () => {
  const f = fixture();
  for (const query of [
    'from=2026-02-30&to=2026-03-02',
    'from=2026-01-01&to=2027-01-01',
    'from=2026-10-25&to=2026-10-26&calendarId=other',
    'from=2026-10-25&from=2026-10-24&to=2026-10-26',
  ]) {
    assert.equal(
      (
        await readCalendarAppointments(
          f.request(`/calendar-appointments?${query}`),
          f.env,
          f.fetcher,
          now
        )
      ).status,
      400
    );
  }
  const path = '/calendar-appointments?from=2026-10-25&to=2026-10-26';
  assert.equal(
    (
      await readGoogleContacts(
        f.request(path, {
          headers: { 'X-Contacts-Account': 'another@example.test' },
        }),
        f.env,
        f.fetcher
      )
    ).status,
    503
  );
  assert.equal(f.calls.length, 0);
  assert.equal((await worker.fetch(f.request(path), f.env)).status, 404);
  for (const pages of [
    Array.from({ length: 4 }, (_, i) => ({
      kind: 'calendar#events',
      items: [],
      nextPageToken: `cursor${i}`,
    })),
    [new Response('private', { status: 403 })],
    [
      {
        kind: 'calendar#events',
        items: [{ ...event(), end: { dateTime: 'invalid' } }],
      },
    ],
  ]) {
    const failing = fixture(pages);
    const result = await readCalendarAppointments(
      failing.request(path),
      failing.env,
      failing.fetcher,
      now
    );
    assert.equal(result.status, 503);
    assert.doesNotMatch(await result.text(), /private|token/);
  }
});
