import assert from 'node:assert/strict';
import test from 'node:test';
import { database } from './fixtures/database.ts';
import {
  contactSummary,
  enqueueSummaryRefresh,
  observeSummarySources,
} from '../src/contact-summary.ts';
import { runSummaries } from '../src/summary-runner.ts';
import {
  generateSummary,
  sourceFingerprint,
  validateSummary,
} from '../src/summary-model.ts';
import { createBackofficeHandler } from '../src/index.ts';
import { createPreviewHandler } from '../src/preview.ts';
import { saveContactAnimals } from '../src/contact-animals.ts';
import { AccessError, type Env } from '../src/config.ts';
import type { ContactSources, SummaryDossier } from '../src/summary-types.ts';

function source(id = 'people/1'): ContactSources {
  return {
    id,
    notesState: 'ready',
    observedAt: '2026-10-07T10:00:00Z',
    notes: [
      {
        id: 'google:original',
        kind: 'google-note',
        text: 'Préfère un appel avant le rendez-vous. Moka demande un accueil calme.',
      },
    ],
    appointments: [
      {
        id: 'booking:1',
        kind: 'appointment',
        date: '2026-09-01T10:00:00Z',
        animal: 'Moka',
        animalType: 'Chien',
        breed: '',
        birth: '',
        reason: 'Mobilité',
        status: 'active',
        oldInvitee: null,
        newInvitee: null,
      },
    ],
  };
}
const result = () => ({
  sentences: [
    {
      text: 'Une réservation pour Moka est enregistrée le 1er septembre 2026.',
      sourceIds: ['booking:1'],
    },
    { text: 'Le motif indiqué est la mobilité.', sourceIds: ['booking:1'] },
    {
      text: 'La note recommande un appel et un accueil calme pour Moka.',
      sourceIds: ['google:original'],
    },
  ],
});
const response = (value = result()) =>
  Response.json({
    status: 'completed',
    output: [
      {
        type: 'message',
        content: [{ type: 'output_text', text: JSON.stringify(value) }],
      },
    ],
    usage: { input_tokens: 300, output_tokens: 90 },
  });

function fixture(count = 1) {
  const t = database();
  const people = new Map(
    Array.from({ length: count }, (_, i) => {
      const s = source(`people/${i + 1}`);
      return [s.id, s] as const;
    })
  );
  const sourceCalls: Request[] = [];
  const modelCalls: RequestInit[] = [];
  let failSources = false;
  let omitFromListing = false;
  const env: Env = {
    APP_ENVIRONMENT: 'production',
    DB: t.db,
    OPENAI_API_KEY: 'fictitious-model-key',
    ASSETS: {
      fetch: async () => new Response(),
      connect: () => {
        throw new Error('Unused test socket');
      },
    },
    APP_ORIGIN: 'https://admin.osteopathie-animale-bordeaux.fr',
    ACCESS_TEAM_DOMAIN: 'https://fictitious-tests.cloudflareaccess.com',
    ACCESS_AUD: 'a'.repeat(64),
    GOOGLE_CONTACTS: {
      async fetch(request) {
        sourceCalls.push(request);
        if (failSources)
          return Response.json(
            { error: 'contact_sources_unavailable' },
            { status: 503 }
          );
        const url = new URL(request.url);
        if (url.pathname === '/source') {
          const contact = people.get(url.searchParams.get('id')!);
          return contact
            ? Response.json({ contact })
            : Response.json({ error: 'contact_not_found' }, { status: 404 });
        }
        const offset = Number(url.searchParams.get('pageToken') ?? 0);
        const rows = omitFromListing ? [] : [...people.values()];
        return Response.json({
          contacts: rows.slice(offset, offset + 100),
          nextPageToken:
            offset + 100 < rows.length ? String(offset + 100) : null,
        });
      },
    },
  };
  const model = async (_input: string, init?: RequestInit) => {
    modelCalls.push(init!);
    return response();
  };
  return {
    ...t,
    env,
    people,
    sourceCalls,
    modelCalls,
    model,
    mode: (mode: string) =>
      t.sqlite
        .prepare('UPDATE summary_settings SET mode=? WHERE id=1')
        .run(mode),
    failSources: (value: boolean) => {
      failSources = value;
    },
    omitFromListing: () => {
      omitFromListing = true;
    },
  };
}

test('paused defaults do no IO; observe imports sources without calling the model', async () => {
  const f = fixture();
  await runSummaries(f.env, f.model);
  assert.equal(f.sourceCalls.length, 0);
  f.mode('observe');
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 0);
  assert.equal((await contactSummary('people/1', f.env)).state, 'pending');
  assert.equal(
    (await contactSummary('people/1', f.env)).sources!.notes[0]!.text,
    source().notes[0]!.text
  );
  f.sqlite.close();
});

test('first generation is stored with evidence and repeated scans or refreshes do not call Luna again', async () => {
  const f = fixture();
  f.mode('live');
  const counts = await runSummaries(f.env, f.model);
  assert.equal(counts.generated, 1);
  const view = await contactSummary('people/1', f.env);
  assert.equal(view.state, 'ready');
  assert.deepEqual(view.summary, result());
  assert.deepEqual(view.summarySources!.appointments, source().appointments);
  const call = JSON.parse(String(f.modelCalls[0]!.body));
  assert.equal(call.model, 'gpt-6-luna');
  assert.equal(call.reasoning.effort, 'low');
  assert.equal(call.store, false);
  assert.equal(call.text.format.strict, true);
  assert.equal(call.tools, undefined);
  assert.doesNotMatch(call.input, /people\/1|fictitious-model-key/);
  f.sqlite.exec('UPDATE summary_settings SET next_scan=0');
  f.people.get('people/1')!.observedAt = '2026-10-07T11:00:00Z';
  await runSummaries(f.env, f.model);
  await enqueueSummaryRefresh(f.db, 'people/1');
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 1);
  f.sqlite.close();
});

test('pagination persists across invocations and imports all contacts', async () => {
  const f = fixture(102);
  f.mode('observe');
  assert.equal((await runSummaries(f.env, f.model)).scanned, 100);
  assert.equal(
    f.sqlite.prepare('SELECT scan_cursor FROM summary_settings').get()!
      .scan_cursor,
    '100'
  );
  assert.equal((await runSummaries(f.env, f.model)).scanned, 2);
  assert.equal(
    f.sqlite.prepare('SELECT COUNT(*) AS n FROM contact_summary_sources').get()!
      .n,
    102
  );
  assert.equal(
    f.sqlite.prepare('SELECT scan_active FROM summary_settings').get()!
      .scan_active,
    0
  );
  f.sqlite.close();
});

test('empty and ambiguous sources skip model calls without losing original notes', async () => {
  const f = fixture(2);
  f.mode('live');
  const empty = f.people.get('people/1')!;
  empty.notes = [];
  empty.appointments = [];
  f.people.get('people/2')!.notesState = 'review';
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 0);
  assert.equal((await contactSummary('people/1', f.env)).state, 'insufficient');
  assert.equal((await contactSummary('people/2', f.env)).state, 'review');
  assert.equal(
    (await contactSummary('people/2', f.env)).sources!.notes.length,
    1
  );
  f.sqlite.close();
});

test('a changed source queues a new summary; failure keeps the previous summary and evidence', async () => {
  const f = fixture();
  f.mode('live');
  await runSummaries(f.env, f.model);
  f.people.get('people/1')!.notes[0]!.text += ' Nouvelle préférence.';
  await enqueueSummaryRefresh(f.db, 'people/1');
  await runSummaries(f.env, async () =>
    Response.json(
      { error: 'private-upstream-note' },
      { status: 429, headers: { 'Retry-After': '120' } }
    )
  );
  const view = await contactSummary('people/1', f.env);
  assert.equal(view.state, 'error');
  assert.equal(view.stale, true);
  assert.deepEqual(view.summary, result());
  assert.notEqual(
    view.summarySources!.notes[0]!.text,
    view.sources!.notes[0]!.text
  );
  const job = f.sqlite
    .prepare("SELECT * FROM summary_jobs WHERE kind='generate'")
    .get()!;
  assert.equal(job.attempts, 1);
  assert.ok(Number(job.due_at) >= Date.now() + 110000);
  assert.doesNotMatch(String(job.error_code), /private-upstream/);
  f.sqlite.close();
});

test('restoring previously summarized sources cancels obsolete work and lets other contacts progress', async () => {
  const f = fixture(2);
  f.mode('live');
  await runSummaries(f.env, f.model);
  const original = structuredClone(f.people.get('people/1')!);
  const changed = structuredClone(original);
  changed.notes[0]!.text += ' Une préférence temporaire.';
  await observeSummarySources(f.db, [changed]);
  await observeSummarySources(f.db, [original]);
  assert.equal(
    f.sqlite
      .prepare(
        "SELECT state FROM summary_jobs WHERE contact_id='people/1' AND kind='generate'"
      )
      .get()!.state,
    'done'
  );
  assert.equal((await runSummaries(f.env, f.model)).generated, 1);
  assert.equal(f.modelCalls.length, 2);
  assert.equal((await contactSummary('people/1', f.env)).state, 'ready');
  assert.equal((await contactSummary('people/2', f.env)).state, 'ready');
  f.sqlite.close();
});

test('a result cannot publish over newer sources or a refresh requested during generation', async () => {
  for (const scenario of ['source', 'refresh', 'pause', 'lease']) {
    const f = fixture();
    f.mode('live');
    const counts = await runSummaries(
      f.env,
      async () => {
        if (scenario === 'source') {
          const changed = source();
          changed.notes[0]!.text += ' Mise à jour.';
          await observeSummarySources(f.db, [changed]);
        } else if (scenario === 'refresh')
          await enqueueSummaryRefresh(f.db, 'people/1');
        else if (scenario === 'pause') f.mode('paused');
        else f.sqlite.exec('UPDATE summary_settings SET lease_until=0');
        return response();
      },
      1
    );
    assert.equal(counts.generated, 0, scenario);
    assert.equal(
      f.sqlite.prepare('SELECT COUNT(*) AS n FROM contact_summaries').get()!.n,
      0,
      scenario
    );
    assert.equal(
      f.sqlite
        .prepare("SELECT state FROM summary_jobs WHERE kind='generate'")
        .get()!.state,
      'pending'
    );
    f.sqlite.close();
  }
});

test('an existing lease prevents duplicate processing and a lost worker can resume after expiry', async () => {
  const f = fixture();
  f.mode('live');
  f.sqlite
    .prepare('UPDATE summary_settings SET lease_owner=?,lease_until=?')
    .run('other', Date.now() + 120000);
  await runSummaries(f.env, f.model);
  assert.equal(f.sourceCalls.length, 0);
  f.sqlite.exec('UPDATE summary_settings SET lease_until=0');
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 1);
  f.sqlite.close();
});

test('unavailable sources are retried and cannot empty or delete previous history', async () => {
  const f = fixture();
  f.mode('live');
  await runSummaries(f.env, f.model);
  f.failSources(true);
  await enqueueSummaryRefresh(f.db, 'people/1');
  f.sqlite.exec('UPDATE summary_settings SET next_scan=0');
  await runSummaries(f.env, f.model);
  const view = await contactSummary('people/1', f.env);
  assert.deepEqual(view.summary, result());
  assert.equal(view.sources!.appointments.length, 1);
  assert.equal(view.state, 'error');
  assert.equal(f.modelCalls.length, 1);
  f.sqlite.close();
});

test('missing listing entries are verified directly; only a conclusive deletion removes private content', async () => {
  const f = fixture();
  f.mode('live');
  await runSummaries(f.env, f.model);
  f.omitFromListing();
  f.sqlite.exec('UPDATE summary_settings SET next_scan=0');
  await runSummaries(f.env, f.model);
  assert.equal((await contactSummary('people/1', f.env)).state, 'ready');
  f.people.delete('people/1');
  await enqueueSummaryRefresh(f.db, 'people/1');
  await runSummaries(f.env, f.model);
  const deleted = await contactSummary('people/1', f.env);
  assert.equal(deleted.state, 'deleted');
  assert.equal(deleted.summary, null);
  assert.equal(deleted.sources, null);
  f.sqlite.close();
});

test('pilot reserves distinct contacts before calls, obeys its limit and resumes in live mode', async () => {
  const f = fixture(4);
  f.mode('pilot');
  f.sqlite.exec('UPDATE summary_settings SET pilot_limit=2');
  await runSummaries(f.env, f.model);
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 2);
  assert.equal(
    f.sqlite.prepare('SELECT COUNT(*) AS n FROM summary_pilot_contacts').get()!
      .n,
    2
  );
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 2);
  f.mode('live');
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 4);
  f.sqlite.close();
});

test('scan and generation batches stay under the free-plan query and subrequest budget', async () => {
  const f = fixture(10);
  f.mode('live');
  for (let index = 0; index < 3; index++) {
    const queries = f.queries();
    const calls = f.sourceCalls.length + f.modelCalls.length;
    await runSummaries(f.env, f.model);
    assert.ok(
      f.queries() -
        queries +
        f.sourceCalls.length +
        f.modelCalls.length -
        calls <=
        45
    );
  }
  f.sqlite.close();
});

test('animal corrections affect the dossier and fingerprint while preserving historical names', async () => {
  const f = fixture();
  f.sqlite
    .prepare('INSERT INTO contact_animal_overrides VALUES (?,?,?)')
    .run('people/1', JSON.stringify(['Nala']), 'version');
  await observeSummarySources(f.db, [source()]);
  const view = await contactSummary('people/1', f.env);
  assert.deepEqual(view.sources!.contextualAnimals, ['Nala']);
  assert.equal(view.sources!.appointments[0]!.animal, 'Moka');
  const old = view.sources!;
  assert.equal(
    await sourceFingerprint(old),
    await sourceFingerprint({ ...old, observedAt: '2027-01-01T00:00:00Z' })
  );
  assert.notEqual(
    await sourceFingerprint(old),
    await sourceFingerprint({ ...old, contextualAnimals: [] })
  );
  f.sqlite.close();
});

test('the model dossier keeps homonymous animals, canceled and rescheduled bookings and contradictory notes separate', async () => {
  const f = fixture();
  f.mode('live');
  const contact = f.people.get('people/1')!;
  contact.notes[0]!.text =
    'Une note indique que Moka accepte le bruit. Une autre demande un accueil sans bruit.';
  contact.appointments[0]!.status = 'canceled';
  contact.appointments[0]!.newInvitee = 'booking:2';
  contact.appointments.push(
    {
      ...contact.appointments[0]!,
      id: 'booking:2',
      date: '2026-09-08T10:00:00Z',
      status: 'active',
      oldInvitee: 'booking:1',
      newInvitee: null,
    },
    {
      ...contact.appointments[0]!,
      id: 'booking:3',
      animalType: 'Chat',
      reason: 'Autre motif pour un animal homonyme',
      date: '2026-09-10T10:00:00Z',
      status: 'active',
      newInvitee: null,
    }
  );
  await runSummaries(f.env, f.model);
  const input = JSON.parse(JSON.parse(String(f.modelCalls[0]!.body)).input);
  assert.deepEqual(input.sources, [...contact.notes, ...contact.appointments]);
  assert.equal(
    (await contactSummary('people/1', f.env)).sources!.appointments.length,
    3
  );
  f.sqlite.close();
});

test('the operator selection reserves the pilot slots and cannot be widened accidentally', async () => {
  const f = fixture(3);
  f.mode('pilot');
  f.sqlite.exec('UPDATE summary_settings SET pilot_limit=1');
  f.sqlite
    .prepare('INSERT INTO summary_pilot_contacts VALUES (?)')
    .run('people/3');
  assert.throws(() =>
    f.sqlite
      .prepare('INSERT INTO summary_pilot_contacts VALUES (?)')
      .run('people/1')
  );
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 1);
  assert.equal((await contactSummary('people/3', f.env)).state, 'ready');
  assert.equal((await contactSummary('people/1', f.env)).state, 'pending');
  f.sqlite.close();
});

test('temporary failures stop after five attempts and explicit refresh permits recovery', async () => {
  const f = fixture();
  f.mode('live');
  for (let attempt = 0; attempt < 5; attempt++) {
    f.sqlite.exec('UPDATE summary_jobs SET due_at=0');
    await runSummaries(
      f.env,
      async () => Response.json({}, { status: 500 }),
      1
    );
  }
  assert.equal(
    f.sqlite
      .prepare("SELECT state FROM summary_jobs WHERE kind='generate'")
      .get()!.state,
    'error'
  );
  assert.equal(
    f.sqlite
      .prepare("SELECT attempts FROM summary_jobs WHERE kind='generate'")
      .get()!.attempts,
    5
  );
  await enqueueSummaryRefresh(f.db, 'people/1');
  await runSummaries(f.env, f.model);
  assert.equal((await contactSummary('people/1', f.env)).state, 'ready');
  f.sqlite.close();
});

test('invalid references, relative dates, contact details, refusals and incomplete outputs are rejected', async () => {
  const dossier: SummaryDossier = { ...source(), contextualAnimals: [] };
  for (const change of [
    {
      text: 'Un prochain rendez-vous est enregistré.',
      sourceIds: ['booking:1'],
    },
    {
      text: 'La note indique client@example.test.',
      sourceIds: ['google:original'],
    },
    { text: 'Une affirmation sans référence connue.', sourceIds: ['unknown'] },
  ])
    assert.throws(() =>
      validateSummary(
        { sentences: [change, ...result().sentences.slice(1)] },
        dossier
      )
    );
  for (const data of [
    { status: 'incomplete', output: [] },
    {
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'refusal' }] }],
    },
    {
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: '{invalid' }],
        },
      ],
    },
  ])
    await assert.rejects(
      generateSummary(dossier, 'fake', async () => Response.json(data))
    );
});

test('oversized notes remain accessible and no truncated dossier is sent to the model', async () => {
  const f = fixture();
  f.mode('live');
  const note = 'Texte avec accents 🐴. '.repeat(10000);
  f.people.get('people/1')!.notes[0]!.text = note;
  await runSummaries(f.env, f.model);
  assert.equal(f.modelCalls.length, 0);
  assert.equal(
    (await contactSummary('people/1', f.env)).sources!.notes[0]!.text,
    note
  );
  assert.equal((await contactSummary('people/1', f.env)).state, 'error');
  f.sqlite.close();
});

test('summary routes authenticate first, validate origin and never generate during GET or POST', async () => {
  const f = fixture();
  const auth = createBackofficeHandler(async () => ({
    email: 'vantoursludwig@gmail.com',
    name: 'Test',
  }));
  const url = `${f.env.APP_ORIGIN}/api/contact-summary`;
  assert.equal(
    (await auth(new Request(`${url}?id=people%2F1`), f.env)).status,
    200
  );
  assert.equal(f.sourceCalls.length, 0);
  const denied = createBackofficeHandler(async () => {
    throw new AccessError(401, 'session_expired');
  });
  assert.equal(
    (await denied(new Request(`${url}?id=people%2F1`), f.env)).status,
    401
  );
  assert.equal(
    (await auth(new Request(`${url}?id=people%2F1&id=people%2F2`), f.env))
      .status,
    400
  );
  assert.equal(
    (
      await auth(
        new Request(`${url}/refresh`, {
          method: 'POST',
          headers: {
            Origin: 'https://foreign.test',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: 'people/1' }),
        }),
        f.env
      )
    ).status,
    403
  );
  const queued = await auth(
    new Request(`${url}/refresh`, {
      method: 'POST',
      headers: { Origin: f.env.APP_ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'people/1' }),
    }),
    f.env
  );
  assert.equal(queued.status, 200);
  assert.equal(f.sourceCalls.length, 0);
  assert.equal(f.modelCalls.length, 0);
  assert.match(queued.headers.get('Cache-Control')!, /no-store/);
  f.sqlite.close();
});

test('preview cannot read production summaries or use injected Google and OpenAI bindings', async () => {
  const f = fixture();
  f.mode('live');
  await runSummaries(f.env, f.model);
  const before = f.sourceCalls.length;
  const preview = {
    ...f.env,
    APP_ENVIRONMENT: 'preview',
    APP_ORIGIN: 'https://admin-preview.osteopathie-animale-bordeaux.fr',
  } as Env;
  assert.equal(
    (await contactSummary('people/1', preview)).state,
    'unavailable'
  );
  await runSummaries(preview, async () => {
    throw new Error('Must not call');
  });
  const handle = createPreviewHandler(async () => ({
    email: 'vantoursludwig@gmail.com',
    name: 'Test',
  }));
  const read = await handle(
    new Request(`${preview.APP_ORIGIN}/api/contact-summary?id=people%2F1`),
    preview
  );
  assert.doesNotMatch(await read.text(), /Préfère|Mobilité/);
  const refresh = await handle(
    new Request(`${preview.APP_ORIGIN}/api/contact-summary/refresh`, {
      method: 'POST',
      headers: {
        Origin: preview.APP_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'people/1' }),
    }),
    preview
  );
  assert.equal(refresh.status, 503);
  assert.equal(f.sourceCalls.length, before);
  f.sqlite.close();
});

test('saving animal corrections and invalidating summaries is atomic and rejects stale edits', async () => {
  const f = fixture();
  f.sqlite
    .prepare('INSERT INTO contact_animal_overrides VALUES (?,?,?)')
    .run('people/1', null, 'first');
  await saveContactAnimals(
    { id: 'people/1', version: 'first', animals: ['Nala'] },
    f.env
  );
  const before = f.sqlite
    .prepare('SELECT * FROM contact_animal_overrides')
    .get()!;
  const jobVersion = f.sqlite
    .prepare("SELECT version FROM summary_jobs WHERE kind='refresh'")
    .get()!.version;
  await assert.rejects(
    saveContactAnimals(
      { id: 'people/1', version: 'first', animals: ['Incorrect'] },
      f.env
    )
  );
  assert.equal(
    f.sqlite
      .prepare("SELECT version FROM summary_jobs WHERE kind='refresh'")
      .get()!.version,
    jobVersion
  );
  f.sqlite.exec('DROP TABLE summary_jobs');
  await assert.rejects(
    saveContactAnimals(
      { id: 'people/1', version: before.version, animals: ['Autre'] },
      f.env
    )
  );
  assert.deepEqual(
    f.sqlite.prepare('SELECT * FROM contact_animal_overrides').get(),
    before
  );
  f.sqlite.close();
});
