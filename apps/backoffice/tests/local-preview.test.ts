import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { database } from './fixtures/database.ts';
import {
  previewSnapshotQuery,
  snapshotFromRows,
  saveLocalPreview,
  readLocalPreview,
  loadLocalPreview,
} from '../scripts/local-preview-data.mjs';
import { createDemoTransport } from '../scripts/preview-data.mjs';

test('local copy uses only the active snapshot, preserves archived lists and never mutates its source', async () => {
  const f = database();
  try {
    f.sqlite.exec(`
      INSERT INTO contact_snapshots(id, appointments_available) VALUES ('old', 1), ('current', 0);
      UPDATE preview_state SET active_snapshot = 'current' WHERE id = 1;
      INSERT INTO mailing_lists(id, name, archived_at) VALUES ('archive', 'Archived', '2026-01-01'), ('active', 'Active', NULL);
      INSERT INTO mailing_list_contacts VALUES ('archive', 'people/test', 'unsubscribed');
    `);
    const contact = {
      id: 'people/test',
      etag: 'v1',
      givenName: 'Test',
      familyName: 'Contact',
      name: 'Test Contact',
      emails: ['test@example.test'],
      phones: [],
      animals: [],
      lastAppointment: null,
      labelIds: [],
    };
    f.sqlite
      .prepare('INSERT INTO copied_contacts VALUES (?, ?, ?, ?)')
      .run('current', contact.id, contact.etag, JSON.stringify(contact));
    f.sqlite
      .prepare('INSERT INTO copied_contacts VALUES (?, ?, ?, ?)')
      .run(
        'old',
        'people/old',
        'v1',
        JSON.stringify({ ...contact, id: 'people/old' })
      );
    const data = snapshotFromRows(f.sqlite.prepare(previewSnapshotQuery).all());
    assert.equal(data.contacts.length, 1);
    assert.equal(data.snapshotId, 'current');
    const transport = createDemoTransport(data);
    const page = await transport('/api/contacts');
    assert.ok('appointmentsAvailable' in page);
    assert.equal(page.appointmentsAvailable, false);
    const lists = await transport('/api/mailing-lists');
    assert.ok('archivedLists' in lists);
    assert.equal(lists.archivedLists.length, 1);
    await transport('/api/mailing-lists', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'archive', restore: true }),
    });
    const restored = await transport('/api/mailing-lists');
    assert.ok('memberships' in restored);
    assert.equal(restored.memberships[0].status, 'unsubscribed');
    await transport('/api/contact', {
      method: 'PATCH',
      body: JSON.stringify({ ...contact, givenName: 'Local' }),
    });
    const changed = await transport('/api/contacts');
    assert.ok('contacts' in changed);
    assert.equal(changed.contacts[0].givenName, 'Local');
    assert.equal(data.contacts[0]!.givenName, 'Test');
    assert.equal(
      f.sqlite
        .prepare('SELECT document FROM copied_contacts WHERE snapshot_id = ?')
        .get('current')!.document,
      JSON.stringify(contact)
    );
  } finally {
    f.sqlite.close();
  }
});

test('local development requires a real copy; demo data is always an explicit choice', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'osteo-local-mode-test-'));
  const path = pathToFileURL(join(directory, 'copy.json'));
  try {
    await assert.rejects(
      loadLocalPreview({ path }),
      /Copie de production absente/
    );
    assert.equal(await loadLocalPreview({ path, demo: true }), null);
    const data = snapshotFromRows([
      {
        kind: 'state',
        document: '{"snapshotId":null,"appointmentsAvailable":1}',
      },
    ]);
    await saveLocalPreview(data, path);
    assert.deepEqual(await loadLocalPreview({ path }), data);
    assert.equal(await loadLocalPreview({ path, demo: true }), null);
    await writeFile(path, 'invalid-private-test-content');
    await assert.rejects(loadLocalPreview({ path }), /Copie locale invalide/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('private local copy is saved with restricted permissions; invalid files never fall back to demo data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'osteo-local-test-'));
  const path = pathToFileURL(join(directory, 'copy.json'));
  try {
    assert.equal(await readLocalPreview(path), null);
    const data = snapshotFromRows([
      {
        kind: 'state',
        document: JSON.stringify({
          snapshotId: null,
          appointmentsAvailable: 1,
        }),
      },
    ]);
    await saveLocalPreview(data, path);
    assert.deepEqual(await readLocalPreview(path), data);
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    await writeFile(path, 'invalid-private-test-content');
    await assert.rejects(readLocalPreview(path), {
      message: 'Copie locale invalide. Relancer preview:pull.',
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
