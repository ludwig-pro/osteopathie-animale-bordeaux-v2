import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';
import type {
  Booking,
  Env,
  Fetcher,
  Person,
  ScheduledEvent,
  Invitee,
} from '../src/types.ts';

export function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new NodeURL('../migrations/0001_sync.sql', import.meta.url),
      'utf8'
    )
  );
  const db = {
    prepare(sql: string) {
      let args: (string | number | null)[] = [];
      const statement = {
        bind(...values: (string | number | null)[]) {
          args = values;
          return statement;
        },
        async first() {
          return sqlite.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...args), success: true };
        },
        async run() {
          const r = sqlite.prepare(sql).run(...args);
          return { success: true, meta: { changes: Number(r.changes) } };
        },
      };
      return statement;
    },
    async batch(statements: { run: () => Promise<unknown> }[]) {
      sqlite.exec('BEGIN');
      try {
        const result = [];
        for (const s of statements) result.push(await s.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as D1Database;
  return { db, sqlite };
}
export function environment(db: D1Database): Env {
  return {
    DB: db,
    ENVIRONMENT: 'local',
    EXPECTED_GOOGLE_EMAIL: 'owner@example.com',
    CALENDLY_USER_URI: 'https://api.calendly.com/users/owner',
    CALENDLY_ORGANIZATION_URI: 'https://api.calendly.com/organizations/org',
    CALENDLY_TOKEN: 'fake-pat',
    CALENDLY_SIGNING_KEY: 'fake-signing-key',
    GOOGLE_OAUTH: JSON.stringify({
      client_id: 'test',
      client_secret: 'fake',
      refresh_token: 'fake-refresh',
      sub: 'owner-id',
    }),
  };
}
export function booking(
  id = 'invitee-1',
  overrides: Partial<Booking> = {}
): Booking {
  return {
    uri: `https://api.calendly.com/scheduled_events/event-1/invitees/${id}`,
    eventUri: 'https://api.calendly.com/scheduled_events/event-1',
    email: 'person@example.com',
    name: 'Camille Exemple',
    phone: '06 12 34 56 78',
    start: '2025-01-02T10:00:00Z',
    status: 'active',
    animal: 'Oslo',
    breed: 'Chien',
    birth: '2020',
    reason: 'Consultation',
    oldInvitee: null,
    newInvitee: null,
    updatedAt: '2025-01-01T10:00:00Z',
    ...overrides,
  };
}
export function upstream() {
  const people = new Map<string, Person>();
  const events = new Map<string, ScheduledEvent>();
  const invitees = new Map<string, Invitee>();
  const calls: { url: URL; method: string; body: unknown }[] = [];
  const behavior = {
    lostCreate: false,
    rejectCreateOnce: false,
    updateConflict: false,
    reauthorize: false,
    wrongAccount: false,
    rateLimited: false,
    groups: [] as { resourceName: string; name: string }[],
    createCalls: 0,
  };
  const fetcher: Fetcher = async (input, init) => {
    const url = new URL(input),
      method = init?.method ?? 'GET',
      body = init?.body
        ? JSON.parse(
            String(init.body).startsWith('{') ? String(init.body) : '{}'
          )
        : undefined;
    calls.push({ url, method, body });
    if (url.hostname === 'oauth2.googleapis.com')
      return Response.json(
        behavior.reauthorize
          ? { error: 'invalid_grant' }
          : { access_token: 'fake-access' },
        { status: behavior.reauthorize ? 400 : 200 }
      );
    if (url.hostname === 'openidconnect.googleapis.com')
      return Response.json({
        email: behavior.wrongAccount
          ? 'wrong@example.com'
          : 'owner@example.com',
        email_verified: true,
        sub: 'owner-id',
      });
    if (url.hostname === 'api.calendly.com') {
      if (url.pathname === '/users/me')
        return Response.json({
          resource: {
            uri: 'https://api.calendly.com/users/owner',
            current_organization: 'https://api.calendly.com/organizations/org',
          },
        });
      if (url.pathname === '/scheduled_events') {
        // A regular member can read personal history with user alone; adding
        // organization would require administrator rights in Calendly.
        if (url.searchParams.has('organization'))
          return Response.json({}, { status: 403 });
        const rows = [...events.values()],
          offset = Number(url.searchParams.get('page_token') ?? 0),
          count = Number(url.searchParams.get('count'));
        return Response.json({
          collection: rows.slice(offset, offset + count),
          pagination: {
            next_page_token:
              offset + count < rows.length ? String(offset + count) : null,
          },
        });
      }
      if (url.pathname.endsWith('/invitees')) {
        const rows = [...invitees.values()].filter(
          (i) => i.event === input.split('/invitees')[0]
        );
        const offset = Number(url.searchParams.get('page_token') ?? 0),
          count = Number(url.searchParams.get('count'));
        return Response.json({
          collection: rows.slice(offset, offset + count),
          pagination: {
            next_page_token:
              offset + count < rows.length ? String(offset + count) : null,
          },
        });
      }
      const resource = events.get(input) ?? invitees.get(input);
      if (resource) return Response.json({ resource });
      return Response.json({}, { status: 404 });
    }
    if (url.hostname !== 'people.googleapis.com')
      throw new Error('Unexpected host in test');
    if (behavior.rateLimited)
      return Response.json(
        {},
        { status: 429, headers: { 'Retry-After': '120' } }
      );
    if (url.pathname === '/v1/people/me/connections') {
      const offset = Number(url.searchParams.get('pageToken') ?? 0),
        count = 100,
        rows = [...people.values()];
      return Response.json({
        connections: rows.slice(offset, offset + count),
        nextPageToken:
          offset + count < rows.length ? String(offset + count) : undefined,
      });
    }
    if (url.pathname === '/v1/contactGroups') {
      if (method === 'GET')
        return Response.json({ contactGroups: behavior.groups });
      const group = {
        resourceName: 'contactGroups/calendly',
        name: 'Calendly',
      };
      behavior.groups.push(group);
      return Response.json(group);
    }
    if (url.pathname === '/v1/people:createContact') {
      behavior.createCalls++;
      if (behavior.rejectCreateOnce) {
        behavior.rejectCreateOnce = false;
        return Response.json(
          {},
          { status: 429, headers: { 'Retry-After': '120' } }
        );
      }
      const resourceName = `people/${people.size + 1}`;
      const p = {
        ...body,
        resourceName,
        metadata: { sources: [{ type: 'CONTACT', etag: '1' }] },
      } as Person;
      people.set(resourceName, p);
      if (behavior.lostCreate) {
        behavior.lostCreate = false;
        throw new Error('Response lost');
      }
      return Response.json(p);
    }
    const resource = url.pathname.slice(4).replace(':updateContact', '');
    const existing = people.get(resource);
    if (!existing) return Response.json({}, { status: 404 });
    if (method === 'GET') return Response.json(existing);
    if (behavior.updateConflict) {
      behavior.updateConflict = false;
      existing.biographies = [{ value: 'Nouvelle note manuelle' }];
      return Response.json({}, { status: 400 });
    }
    const next = {
      ...existing,
      ...body,
      resourceName: resource,
      metadata: { sources: [{ type: 'CONTACT', etag: '2' }] },
    } as Person;
    people.set(resource, next);
    return Response.json(next);
  };
  return { fetcher, people, events, invitees, calls, behavior };
}
