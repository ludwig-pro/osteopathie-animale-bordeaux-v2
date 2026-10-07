import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { URL as NodeURL } from 'node:url';

export function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const migration of [
    '0001_mailing_lists.sql',
    '0002_preview_snapshots.sql',
  ])
    sqlite.exec(
      readFileSync(
        new NodeURL(`../../migrations/${migration}`, import.meta.url),
        'utf8'
      )
    );
  let queries = 0;
  const db = {
    prepare(sql: string) {
      let args: (string | number | null)[] = [];
      const statement = {
        bind(...values: (string | number | null)[]) {
          args = values;
          return statement;
        },
        async first() {
          queries++;
          return sqlite.prepare(sql).get(...args) ?? null;
        },
        async all() {
          queries++;
          return { results: sqlite.prepare(sql).all(...args) };
        },
        async run() {
          queries++;
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
  return { db, sqlite, queries: () => queries };
}
