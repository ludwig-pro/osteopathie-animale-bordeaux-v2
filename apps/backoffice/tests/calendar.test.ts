import assert from 'node:assert/strict';
import test from 'node:test';
import { nextAppointment } from '../src/calendar.ts';
import {
  CONTACTS_ACCOUNT_EMAIL,
  AccessError,
  type Env,
} from '../src/config.ts';
import { createBackofficeHandler } from '../src/index.ts';
import { createPreviewHandler } from '../src/preview.ts';
import { database } from './fixtures/database.ts';
import {
  createDemoData,
  createDemoTransport,
} from '../scripts/preview-data.mjs';

const origin = 'https://admin.osteopathie-animale-bordeaux.fr';
const appointment = {
  id: 'calendar-event',
  title: 'Consultation fictive de Moka',
  startsAt: '2099-10-25T10:00:00Z',
  endsAt: '2099-10-25T11:00:00Z',
  location: 'Cabinet fictif',
  url: 'https://calendar.google.com/calendar/event?eid=demo',
  status: 'confirmed',
};
const checkedAt = '2026-10-08T08:00:00Z';
function fixture(value: unknown = { appointment, checkedAt }) {
  const calls: Request[] = [];
  const env = {
    APP_ENVIRONMENT: 'production',
    APP_ORIGIN: origin,
    ACCESS_TEAM_DOMAIN: 'https://fictitious-tests.cloudflareaccess.com',
    ACCESS_AUD: 'a'.repeat(64),
    GOOGLE_CONTACTS: {
      async fetch(request: Request) {
        calls.push(request);
        return value instanceof Response ? value : Response.json(value);
      },
    },
  } as Env;
  const handle = createBackofficeHandler(async () => ({
    email: CONTACTS_ACCOUNT_EMAIL,
    name: 'Agathe Lescout',
  }));
  return { env, calls, handle };
}

test('the authenticated calendar API uses the owner binding and publishes only appointment fields', async () => {
  const f = fixture({
    appointment: {
      ...appointment,
      description: 'private-note',
      attendees: ['private-email'],
    },
    checkedAt,
    token: 'private-token',
  });
  const response = await f.handle(
    new Request(`${origin}/api/next-appointment`),
    f.env
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    state: 'ready',
    appointment,
    checkedAt,
    demo: false,
  });
  assert.equal(f.calls[0]!.url, 'https://contacts.internal/next-appointment');
  assert.equal(
    f.calls[0]!.headers.get('X-Contacts-Account'),
    CONTACTS_ACCOUNT_EMAIL
  );
  assert.match(response.headers.get('Cache-Control')!, /private, no-store/);
});

test('calendar routes authenticate before IO and reject methods, arbitrary calendars and HEAD reads', async () => {
  const f = fixture();
  const unauthenticated = createBackofficeHandler(async () => {
    throw new AccessError(401, 'authentication_required');
  });
  assert.equal(
    (
      await unauthenticated(
        new Request(`${origin}/api/next-appointment`),
        f.env
      )
    ).status,
    401
  );
  for (const [request, status] of [
    [new Request(`${origin}/api/next-appointment`, { method: 'POST' }), 405],
    [new Request(`${origin}/api/next-appointment?calendarId=other`), 400],
    [new Request(`${origin}/api/next-appointment`, { method: 'HEAD' }), 200],
  ] as const)
    assert.equal((await f.handle(request, f.env)).status, status);
  assert.equal(f.calls.length, 0);
});

test('preview, local copies and missing configuration cannot read a real Google Calendar', async () => {
  const f = fixture();
  for (const environment of ['local', 'preview'] as const)
    assert.deepEqual(
      await nextAppointment({ ...f.env, APP_ENVIRONMENT: environment }),
      {
        state: 'unavailable',
        appointment: null,
        checkedAt: null,
        demo: false,
      }
    );
  assert.equal(
    (await nextAppointment({ ...f.env, GOOGLE_CONTACTS: undefined })).state,
    'not_connected'
  );
  const db = database();
  const response = await createPreviewHandler(async () => ({
    email: CONTACTS_ACCOUNT_EMAIL,
    name: 'Agathe Lescout',
  }))(
    new Request(
      'https://admin-preview.osteopathie-animale-bordeaux.fr/api/next-appointment'
    ),
    {
      ...f.env,
      APP_ENVIRONMENT: 'preview',
      APP_ORIGIN: 'https://admin-preview.osteopathie-animale-bordeaux.fr',
      DB: db.db,
    }
  );
  assert.equal(response.status, 200);
  assert.equal(
    ((await response.json()) as { state: string }).state,
    'unavailable'
  );
  assert.equal(f.calls.length, 0);
  db.sqlite.close();
});

test('preview and local calendars use the exact dated production copy without an upstream call', async () => {
  const f = fixture();
  const db = database();
  try {
    db.sqlite.exec(
      "INSERT INTO contact_snapshots(id,data_version) VALUES ('copy',1); UPDATE preview_state SET active_snapshot='copy' WHERE id=1;"
    );
    const view = { state: 'ready', appointment, checkedAt, demo: false };
    db.sqlite
      .prepare('INSERT INTO copied_calendar VALUES (?,?)')
      .run('copy', JSON.stringify(view));
    for (const environment of ['preview', 'local'] as const) {
      const data = await nextAppointment({
        ...f.env,
        DB: db.db,
        APP_ENVIRONMENT: environment,
      });
      const { copiedAt, ...actual } = data;
      assert.ok(copiedAt && Number.isFinite(Date.parse(copiedAt)));
      assert.deepEqual(actual, view);
    }
    assert.equal(f.calls.length, 0);
  } finally {
    db.sqlite.close();
  }
});

test('conclusive emptiness and a missing calendar authorization differ from failures and malformed data', async () => {
  assert.equal(
    (await nextAppointment(fixture({ appointment: null, checkedAt }).env))
      .state,
    'empty'
  );
  for (const error of [
    'google_connection_unavailable',
    'google_calendar_authorization_required',
  ])
    assert.equal(
      (
        await nextAppointment(
          fixture(Response.json({ error }, { status: 503 })).env
        )
      ).state,
      'not_connected'
    );
  for (const value of [
    { appointment: null },
    { appointment: { ...appointment, startsAt: 'invalid' }, checkedAt },
    { appointment: { ...appointment, url: 'javascript:alert(1)' }, checkedAt },
    {
      appointment: { ...appointment, endsAt: appointment.startsAt },
      checkedAt,
    },
    new Response('private-upstream-data', { status: 503 }),
    Response.json({ error: 'private-upstream-data' }, { status: 503 }),
    new Response('x'.repeat(65537)),
  ]) {
    const f = fixture(value);
    const response = await f.handle(
      new Request(`${origin}/api/next-appointment`),
      f.env
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: 'google_calendar_unavailable',
    });
  }
});

test('offline demos show a clearly fictitious future appointment and copied contacts never fabricate a calendar', async () => {
  const transport = createDemoTransport(createDemoData());
  const data = await transport('/api/next-appointment');
  assert.ok('state' in data && 'demo' in data && 'appointment' in data);
  assert.equal(data.state, 'ready');
  assert.equal(data.demo, true);
  assert.ok(data.appointment);
  assert.ok(Date.parse(data.appointment.startsAt) > Date.now());
  const copied = createDemoData();
  copied.contacts[0]!.id = 'people/copied';
  assert.deepEqual(await createDemoTransport(copied)('/api/next-appointment'), {
    state: 'not_connected',
    appointment: null,
    checkedAt: null,
    demo: false,
  });
});
