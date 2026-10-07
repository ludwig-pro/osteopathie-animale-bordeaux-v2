// Persistent isolated preview using exactly the deployed domain and SQL paths.
import { DatabaseSync } from 'node:sqlite';
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  chmodSync,
  existsSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createBackofficeHandler } from '../src/index.ts';
import { previewContacts } from '../src/preview-contacts.ts';

export function createLocalTransport(
  data,
  path = new URL('../.credentials/local-backoffice.sqlite', import.meta.url)
) {
  mkdirSync(new URL('.', path), { recursive: true, mode: 0o700 });
  const sqlite = new DatabaseSync(fileURLToPath(path));
  chmodSync(path, 0o600);
  sqlite.exec(
    'PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS local_migrations(name TEXT PRIMARY KEY);'
  );
  const migrations = new URL('../migrations/', import.meta.url);
  for (const name of readdirSync(migrations)
    .filter((n) => n.endsWith('.sql'))
    .sort()) {
    if (
      !sqlite
        .prepare('SELECT name FROM local_migrations WHERE name = ?')
        .get(name)
    ) {
      sqlite.exec('BEGIN');
      try {
        sqlite.exec(readFileSync(new URL(name, migrations), 'utf8'));
        sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name);
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  }
  const snapshot = data.snapshotId ?? 'local-copy';
  const active = sqlite
    .prepare('SELECT active_snapshot FROM preview_state WHERE id=1')
    .get().active_snapshot;
  if (!active) {
    sqlite.exec('BEGIN');
    try {
      sqlite
        .prepare(
          'INSERT INTO contact_snapshots(id,appointments_available) VALUES (?,?)'
        )
        .run(snapshot, data.appointmentsAvailable === false ? 0 : 1);
      sqlite
        .prepare('UPDATE preview_state SET active_snapshot=? WHERE id=1')
        .run(snapshot);
      for (const c of data.contacts)
        sqlite
          .prepare('INSERT INTO copied_contacts VALUES (?,?,?,?)')
          .run(snapshot, c.id, c.etag, JSON.stringify(c));
      for (const l of data.labels)
        sqlite
          .prepare('INSERT INTO copied_labels VALUES (?,?,?)')
          .run(snapshot, l.id, JSON.stringify(l));
      for (const l of [...data.lists, ...(data.archivedLists ?? [])])
        sqlite
          .prepare(
            'INSERT INTO mailing_lists(id,name,description,archived_at) VALUES (?,?,?,?)'
          )
          .run(
            l.id,
            l.name,
            l.description,
            (data.archivedLists ?? []).some((a) => a.id === l.id)
              ? new Date().toISOString()
              : null
          );
      for (const m of data.memberships)
        sqlite
          .prepare('INSERT INTO mailing_list_contacts VALUES (?,?,?)')
          .run(m.listId, m.contactId, m.status);
      // Imported history is retained without replaying the correction trigger.
      sqlite.exec('DROP TRIGGER apply_identity_review');
      for (const r of data.identityReviews ?? [])
        sqlite
          .prepare(
            'INSERT INTO identity_reviews(id,contact_id,snapshot_id,actor,action,before_document,after_document,created_at) VALUES (?,?,?,?,?,?,?,?)'
          )
          .run(
            r.id,
            r.contact_id,
            r.snapshot_id,
            r.actor,
            r.action,
            r.before_document,
            r.after_document,
            r.created_at
          );
      for (const a of data.contactAnimals ?? [])
        sqlite
          .prepare('INSERT INTO contact_animals VALUES (?,?,?,?,?)')
          .run(a.contact_id, a.id, a.name, a.source, a.review_id);
      for (const a of data.knownAnimals ?? [])
        sqlite
          .prepare('INSERT INTO known_contact_animals VALUES (?,?,?)')
          .run(a.contact_id, a.animal_key, a.name);
      for (const a of data.animalOverrides ?? [])
        sqlite
          .prepare('INSERT INTO contact_animal_overrides VALUES (?,?,?)')
          .run(a.contact_id, a.names, a.version);
      const migration = readFileSync(
        new URL('0003_contact_identity.sql', migrations),
        'utf8'
      );
      sqlite.exec(
        migration.slice(
          migration.indexOf('CREATE TRIGGER apply_identity_review'),
          migration.indexOf('-- Also protects')
        )
      );
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
  const db = {
    prepare(sql) {
      let args = [];
      const statement = {
        bind(...values) {
          args = values;
          return statement;
        },
        async first() {
          return sqlite.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...args) };
        },
        async run() {
          const result = sqlite.prepare(sql).run(...args);
          return {
            success: true,
            results: [],
            meta: { changes: Number(result.changes) },
          };
        },
      };
      return statement;
    },
    async batch(statements) {
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
  };
  const handler = createBackofficeHandler(async () => ({
    email: 'local-preview',
    name: 'Local',
  }));
  const env = {
    APP_ENVIRONMENT: 'preview',
    APP_ORIGIN: 'http://localhost',
    ACCESS_TEAM_DOMAIN: 'https://local-preview.cloudflareaccess.com',
    ACCESS_AUD: 'a'.repeat(64),
    DB: db,
    GOOGLE_CONTACTS: previewContacts(db),
    REPORTS: {
      async get(key) {
        if (!/^[a-f0-9]{64}\.pdf$/.test(key)) return null;
        const file = new URL(`./consultation-reports/${key}`, path);
        return existsSync(file) ? { body: readFileSync(file) } : null;
      },
    },
  };
  const fetchResponse = (path, init = {}) =>
    handler(
      new Request(new URL(path, env.APP_ORIGIN), {
        ...init,
        headers: { Origin: env.APP_ORIGIN, 'Content-Type': 'application/json' },
      }),
      env
    );
  const transport = async (path, init = {}) => {
    const response = await fetchResponse(path, init);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  };
  return Object.assign(transport, {
    fetchResponse,
    close: () => sqlite.close(),
  });
}
