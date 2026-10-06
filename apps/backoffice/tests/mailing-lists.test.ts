import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { URL as NodeURL } from 'node:url';
import {
  assignLists,
  changeMailingList,
  mailingLists,
  replaceContactLists,
} from '../src/mailing-lists.ts';
import type { Env } from '../src/config.ts';

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    readFileSync(
      new NodeURL('../migrations/0001_mailing_lists.sql', import.meta.url),
      'utf8'
    )
  );
  let calls = 0;
  const db = {
    prepare(sql: string) {
      let args: (string | number | null)[] = [];
      const statement = {
        bind(...values: (string | number | null)[]) {
          assert.ok(values.length <= 100);
          args = values;
          return statement;
        },
        async first() {
          calls++;
          return sqlite.prepare(sql).get(...args) ?? null;
        },
        async all() {
          calls++;
          return { results: sqlite.prepare(sql).all(...args) };
        },
        async run() {
          calls++;
          const prepared = sqlite.prepare(sql);
          if (prepared.columns().length)
            return {
              results: prepared.all(...args),
              success: true,
              meta: { changes: 0 },
            };
          const result = prepared.run(...args);
          return {
            results: [],
            success: true,
            meta: { changes: Number(result.changes) },
          };
        },
      };
      return statement;
    },
    async batch(statements: { run: () => Promise<unknown> }[]) {
      sqlite.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  } as unknown as D1Database;
  return { env: { DB: db } as Env, sqlite, calls: () => calls };
}

test('lists can be created, renamed and archived without deleting their memberships', async () => {
  const f = fixture();
  await changeMailingList(
    'POST',
    { name: ' Chiens ', description: 'Conseils' },
    f.env
  );
  const list = (await mailingLists(f.env)).lists[0]!;
  assert.equal(list.name, 'Chiens');
  await changeMailingList(
    'PATCH',
    { id: list.id, name: 'Clients chiens', description: 'Nouvelles' },
    f.env
  );
  await assignLists({ contactIds: ['people/c1'], listIds: [list.id] }, f.env);
  await changeMailingList('DELETE', { id: list.id }, f.env);
  const archived = await mailingLists(f.env);
  assert.equal(archived.lists.length, 0);
  assert.equal(archived.memberships.length, 0);
  assert.equal(archived.archivedLists?.[0]?.name, 'Clients chiens');
  assert.equal(
    f.sqlite
      .prepare('SELECT COUNT(*) AS count FROM mailing_list_contacts')
      .get()!.count,
    1
  );
  await changeMailingList('PATCH', { id: list.id, restore: true }, f.env);
  assert.equal((await mailingLists(f.env)).memberships.length, 1);
  f.sqlite.close();
});

test('duplicate names, invalid contacts and archived list assignments are rejected', async () => {
  const f = fixture();
  await changeMailingList('POST', { name: 'Clients', description: '' }, f.env);
  await assert.rejects(
    changeMailingList('POST', { name: 'clients', description: '' }, f.env),
    { code: 'list_name_in_use' }
  );
  const list = (await mailingLists(f.env)).lists[0]!;
  await assert.rejects(
    assignLists(
      { contactIds: ['https://example.test'], listIds: [list.id] },
      f.env
    ),
    { code: 'invalid_assignment' }
  );
  await changeMailingList('DELETE', { id: list.id }, f.env);
  await assert.rejects(
    assignLists({ contactIds: ['people/c1'], listIds: [list.id] }, f.env),
    { code: 'list_not_found' }
  );
  assert.equal(
    f.sqlite
      .prepare('SELECT COUNT(*) AS count FROM mailing_list_contacts')
      .get()!.count,
    0
  );
  f.sqlite.close();
});

test('bulk additions are idempotent, start pending and preserve existing opt-outs and confirmed agreements', async () => {
  const f = fixture();
  await changeMailingList(
    'POST',
    { name: 'Actualités', description: '' },
    f.env
  );
  const list = (await mailingLists(f.env)).lists[0]!;
  await replaceContactLists(
    {
      contactId: 'people/c1',
      memberships: [{ listId: list.id, status: 'unsubscribed' }],
    },
    f.env
  );
  await replaceContactLists(
    {
      contactId: 'people/c2',
      memberships: [{ listId: list.id, status: 'confirmed' }],
    },
    f.env
  );
  for (let attempt = 0; attempt < 2; attempt++)
    await assignLists(
      {
        contactIds: ['people/c1', 'people/c2', 'people/c3'],
        listIds: [list.id, list.id],
      },
      f.env
    );
  const data = await mailingLists(f.env);
  assert.equal(data.memberships.length, 3);
  assert.equal(
    data.memberships.find((membership) => membership.contactId === 'people/c1')!
      .status,
    'unsubscribed'
  );
  assert.equal(
    data.memberships.find((membership) => membership.contactId === 'people/c2')!
      .status,
    'confirmed'
  );
  assert.equal(
    data.memberships.find((membership) => membership.contactId === 'people/c3')!
      .status,
    'pending'
  );
  f.sqlite.close();
});

test('a contact can belong to multiple lists and updates do not alter other contacts', async () => {
  const f = fixture();
  for (const name of ['Chiens', 'Chevaux'])
    await changeMailingList('POST', { name, description: '' }, f.env);
  const lists = (await mailingLists(f.env)).lists;
  await assignLists(
    {
      contactIds: ['people/c1', 'people/c2'],
      listIds: lists.map((list) => list.id),
    },
    f.env
  );
  await replaceContactLists(
    {
      contactId: 'people/c1',
      memberships: [{ listId: lists[1]!.id, status: 'confirmed' }],
    },
    f.env
  );
  const data = await mailingLists(f.env);
  assert.equal(
    data.memberships.filter(
      (membership) => membership.contactId === 'people/c1'
    ).length,
    1
  );
  assert.equal(
    data.memberships.filter(
      (membership) => membership.contactId === 'people/c2'
    ).length,
    2
  );
  await assert.rejects(
    replaceContactLists(
      {
        contactId: 'people/c1',
        memberships: [{ listId: lists[1]!.id, status: 'invalid' }],
      },
      f.env
    ),
    { code: 'invalid_assignment' }
  );
  assert.equal((await mailingLists(f.env)).memberships.length, 3);
  f.sqlite.close();
});

test('large bulk assignments respect D1 parameter and free-plan query budgets', async () => {
  const f = fixture();
  for (let index = 0; index < 20; index++)
    await changeMailingList(
      'POST',
      { name: `Liste ${index}`, description: '' },
      f.env
    );
  const lists = (await mailingLists(f.env)).lists;
  const before = f.calls();
  await assignLists(
    {
      contactIds: Array.from({ length: 100 }, (_, index) => `people/c${index}`),
      listIds: lists.map((list) => list.id),
    },
    f.env
  );
  assert.ok(f.calls() - before <= 50);
  assert.equal(
    f.sqlite
      .prepare('SELECT COUNT(*) AS count FROM mailing_list_contacts')
      .get()!.count,
    2000
  );
  f.sqlite.close();
});
