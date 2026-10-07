import { readFileSync, chmodSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { createLocalTransport } from './local-database.mjs';
import {
  parseReportMessage,
  importReport,
  matchRecipients,
} from './consultation-import.mjs';
import { gmailClient } from './gmail-readonly.mjs';
import { CONTACTS_ACCOUNT_EMAIL } from '../src/config.ts';

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      apply: { type: 'boolean', default: false },
      gmail: { type: 'string' },
      database: {
        type: 'string',
        default: 'apps/backoffice/.credentials/local-backoffice.sqlite',
      },
      snapshot: {
        type: 'string',
        default: 'apps/backoffice/.credentials/local-preview-data.json',
      },
    },
  });
  if (
    (Boolean(values.gmail) && positionals.length) ||
    (!values.gmail && !positionals.length)
  )
    throw new Error(
      'Provide either --gmail readonly-token.json or original .eml files'
    );
  const database = resolve(values.database);
  if (!existsSync(database))
    throw new Error('Existing local backoffice database required');
  // Dry-run opens the user's database read-only and never applies migrations.
  if (values.apply) {
    const backup = `${database}.reports-${Date.now()}.backup.sqlite`;
    const source = new DatabaseSync(database);
    source.exec('PRAGMA busy_timeout = 5000');
    source.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
    source.close();
    chmodSync(backup, 0o600);
    createLocalTransport(
      JSON.parse(readFileSync(resolve(values.snapshot), 'utf8')),
      pathToFileURL(database)
    ).close();
  }
  const sqlite = new DatabaseSync(database, { readOnly: !values.apply });
  sqlite.exec('PRAGMA busy_timeout = 5000');
  const contacts = sqlite
    .prepare(
      'SELECT document FROM copied_contacts WHERE snapshot_id = (SELECT active_snapshot FROM preview_state WHERE id = 1)'
    )
    .all()
    .map((row) => JSON.parse(row.document));
  if (!contacts.length) throw new Error('No active contacts snapshot');
  const hasTable = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE name = 'consultation_reports'")
    .get();
  const empty = new DatabaseSync(':memory:');
  empty.exec(
    readFileSync(
      new URL('../migrations/0007_consultation_reports.sql', import.meta.url),
      'utf8'
    )
  );
  const stats = {
    mode: values.apply ? 'apply' : 'dry-run',
    messages: 0,
    reports: 0,
    linked: 0,
    unmatched: 0,
    ambiguous: 0,
    existing: 0,
    failed: 0,
  };
  const seenIds = new Set();
  if (values.apply) {
    for (const row of sqlite
      .prepare(
        'SELECT gmail_id FROM gmail_import_messages WHERE account = ? AND parser_version = 1'
      )
      .all(CONTACTS_ACCOUNT_EMAIL))
      seenIds.add(row.gmail_id);
    for (const row of sqlite
      .prepare(
        'SELECT id, recipients FROM consultation_reports WHERE contact_id IS NULL'
      )
      .all()) {
      const match = matchRecipients(JSON.parse(row.recipients), contacts);
      if (match.contactId)
        sqlite
          .prepare(
            'UPDATE consultation_reports SET contact_id = ?, match_status = ? WHERE id = ?'
          )
          .run(match.contactId, match.status, row.id);
    }
  }
  async function* files() {
    for (const path of positionals)
      yield { raw: readFileSync(resolve(path)), gmailId: null };
  }
  const messages = values.gmail
    ? gmailClient(
        JSON.parse(readFileSync(resolve(values.gmail), 'utf8'))
      ).messages({ seenIds })
    : files();
  for await (const { raw, gmailId } of messages) {
    stats.messages++;
    try {
      const reports = await parseReportMessage(raw);
      for (const report of reports) {
        const result = importReport(
          report,
          contacts,
          hasTable ? sqlite : empty,
          join(dirname(database), 'consultation-reports'),
          values.apply
        );
        stats.reports++;
        stats[result.status]++;
        if (result.existing) stats.existing++;
      }
      if (values.apply && gmailId)
        sqlite
          .prepare(
            'INSERT OR IGNORE INTO gmail_import_messages(account, gmail_id, parser_version, report_count) VALUES (?, ?, 1, ?)'
          )
          .run(CONTACTS_ACCOUNT_EMAIL, gmailId, reports.length);
    } catch {
      stats.failed++;
    }
    if (stats.messages % 100 === 0) console.log(JSON.stringify(stats));
  }
  sqlite.close();
  empty.close();
  console.log(JSON.stringify(stats));
  if (stats.failed) process.exitCode = 1;
} catch (error) {
  const safe = [
    'wrong_gmail_account',
    'gmail_reauthorization_required',
    'No active contacts snapshot',
    'Existing local backoffice database required',
  ];
  console.error(
    safe.includes(error.message) ||
      /^gmail_(read_failed_\d{3}|repeated_cursor)$/.test(error.message)
      ? error.message
      : 'Import interrompu. Vérifier les chemins, les droits Gmail et relancer ; les originaux déjà importés sont conservés. Aucun secret affiché.'
  );
  process.exitCode = 1;
}
