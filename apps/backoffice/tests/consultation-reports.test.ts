import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { database } from './fixtures/database.ts';
import {
  parseReportMessage,
  matchRecipients,
  importReport,
} from '../scripts/consultation-import.mjs';
import { gmailClient } from '../scripts/gmail-readonly.mjs';
import { consultationReports } from '../src/consultation-reports.ts';
import { createBackofficeHandler } from '../src/index.ts';
import {
  AccessError,
  CONTACTS_ACCOUNT_EMAIL,
  type Env,
} from '../src/config.ts';

const contacts = [
  { id: 'people/alpha', emails: ['Client@example.test'] },
  { id: 'people/beta', emails: ['other@example.test'] },
];
const pdf = Buffer.from('%PDF-1.4\nFictitious report test data\n%%EOF');
function eml({
  sender = CONTACTS_ACCOUNT_EMAIL,
  to = 'Client <client@example.test>',
  id = 'report-1@example.test',
  content = pdf,
  filename = 'Compte rendu Test.pdf',
} = {}) {
  return Buffer.from(
    `From: ${sender}\r\nTo: ${to}\r\nMessage-ID: <${id}>\r\nDate: Wed, 7 Oct 2026 17:34:00 +0200\r\nSubject: Compte rendu Test\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="fixture"\r\n\r\n--fixture\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename="${filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${content.toString('base64')}\r\n--fixture--\r\n`
  );
}

test('matches exact recipient emails, preserving aliases and rejecting ambiguous recipients', () => {
  assert.deepEqual(matchRecipients([' CLIENT@example.test '], contacts), {
    status: 'linked',
    contactId: 'people/alpha',
  });
  for (const recipients of [
    ['client@example.test', 'other@example.test'],
    ['client@example.test', 'vet@example.test'],
  ])
    assert.equal(matchRecipients(recipients, contacts).status, 'ambiguous');
  assert.equal(
    matchRecipients(
      ['client@example.test'],
      [...contacts, { id: 'people/shared', emails: ['client@example.test'] }]
    ).status,
    'ambiguous'
  );
  assert.equal(
    matchRecipients(['client+alias@example.test'], contacts).status,
    'unmatched'
  );
  assert.equal(
    matchRecipients(['cl.ient@example.test'], contacts).status,
    'unmatched'
  );
});

test('parses original MIME PDF and date, ignores other sender and invoice, rejects non-PDF', async () => {
  const reports = await parseReportMessage(eml());
  assert.equal(reports.length, 1);
  assert.deepEqual(reports[0]!.content, pdf);
  assert.equal(reports[0]!.sentAt, '2026-10-07T15:34:00.000Z');
  assert.deepEqual(
    await parseReportMessage(eml({ sender: 'someone@example.test' })),
    []
  );
  assert.deepEqual(
    await parseReportMessage(eml({ filename: 'Facture.pdf' })),
    []
  );
  await assert.rejects(
    parseReportMessage(eml({ content: Buffer.from('<html>not a PDF</html>') })),
    /invalid_report_pdf/
  );
});

test('dry-run changes nothing, reimport is idempotent, repeated sends collapse but changed PDFs remain', async () => {
  const { sqlite, db } = database();
  const directory = mkdtempSync(join(tmpdir(), 'reports-test-'));
  try {
    const [report] = await parseReportMessage(eml());
    assert.ok(report);
    importReport(report, contacts, sqlite, directory);
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM consultation_reports').get()!.n,
      0
    );
    importReport(report, contacts, sqlite, directory, true);
    assert.deepEqual(
      readFileSync(join(directory, `${report.sha256}.pdf`)),
      pdf
    );
    assert.equal(
      statSync(join(directory, `${report.sha256}.pdf`)).mode & 0o777,
      0o600
    );
    assert.equal(
      importReport(report, contacts, sqlite, directory, true).existing,
      true
    );
    const [resent] = await parseReportMessage(
      eml({ id: 'resend@example.test' })
    );
    importReport(resent!, contacts, sqlite, directory, true);
    assert.equal(
      sqlite.prepare('SELECT count(*) AS n FROM consultation_reports').get()!.n,
      2
    );
    assert.equal(
      (await consultationReports('people/alpha', { DB: db } as Env)).reports
        .length,
      1
    );
    const [revision] = await parseReportMessage(
      eml({
        id: 'revision@example.test',
        content: Buffer.from('%PDF-1.4\nRevision\n%%EOF'),
      })
    );
    importReport(revision!, contacts, sqlite, directory, true);
    assert.equal(
      (await consultationReports('people/alpha', { DB: db } as Env)).reports
        .length,
      2
    );
    assert.throws(
      () =>
        importReport(
          { ...report, sha256: 'b'.repeat(64) },
          contacts,
          sqlite,
          directory,
          true
        ),
      /source_report_changed/
    );
    importReport(
      report,
      [{ id: 'people/reassigned', emails: ['client@example.test'] }],
      sqlite,
      directory,
      true
    );
    assert.equal(
      sqlite
        .prepare('SELECT contact_id FROM consultation_reports WHERE id = ?')
        .get(report.id)!.contact_id,
      'people/alpha'
    );
  } finally {
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('unmatched originals remain private and can be reconciled on reimport', async () => {
  const { sqlite } = database();
  const directory = mkdtempSync(join(tmpdir(), 'reports-unmatched-'));
  try {
    const [report] = await parseReportMessage(eml());
    importReport(report!, [], sqlite, directory, true);
    assert.equal(
      sqlite.prepare('SELECT match_status FROM consultation_reports').get()!
        .match_status,
      'unmatched'
    );
    importReport(report!, contacts, sqlite, directory, true);
    assert.equal(
      sqlite.prepare('SELECT match_status FROM consultation_reports').get()!
        .match_status,
      'linked'
    );
  } finally {
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('PDF routes require Access, enforce methods, use private headers and never expose unmatched files', async () => {
  const { sqlite, db } = database();
  const directory = mkdtempSync(join(tmpdir(), 'reports-api-'));
  const env = {
    DB: db,
    APP_ORIGIN: 'https://admin.example.test',
    ACCESS_TEAM_DOMAIN: 'https://test.cloudflareaccess.com',
    ACCESS_AUD: 'a'.repeat(64),
    REPORTS: { get: async () => ({ body: pdf }) },
  } as unknown as Env;
  const handler = createBackofficeHandler(async () => ({
    email: CONTACTS_ACCOUNT_EMAIL,
    name: 'Test',
  }));
  try {
    const [report] = await parseReportMessage(eml());
    importReport(report!, contacts, sqlite, directory, true);
    const url = `${env.APP_ORIGIN}/api/consultation-pdf?id=${report!.id}`;
    const denied = await createBackofficeHandler(async () => {
      throw new AccessError(401, 'unauthorized');
    })(new Request(url), env);
    assert.equal(denied.status, 401);
    const response = await handler(new Request(url), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'application/pdf');
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.match(response.headers.get('Content-Disposition')!, /^attachment;/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    const head = await handler(new Request(url, { method: 'HEAD' }), env);
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal(
      (await handler(new Request(url, { method: 'POST' }), env)).status,
      405
    );
    assert.equal(
      (
        await handler(
          new Request(`${env.APP_ORIGIN}/api/consultation-pdf?id=../../secret`),
          env
        )
      ).status,
      404
    );
    sqlite.exec(
      "UPDATE consultation_reports SET contact_id = NULL, match_status = 'unmatched'"
    );
    assert.equal((await handler(new Request(url), env)).status, 404);
  } finally {
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Gmail reads all pages and refuses a different account before reading messages', async () => {
  const paths: string[] = [];
  const fetcher = async (url: string | URL | Request) => {
    const path = String(url);
    paths.push(path);
    if (path.includes('oauth2'))
      return Response.json({ access_token: 'fictitious', expires_in: 3600 });
    if (path.endsWith('/profile'))
      return Response.json({ emailAddress: CONTACTS_ACCOUNT_EMAIL });
    if (path.includes('format=raw'))
      return Response.json({
        labelIds: ['SENT'],
        raw: eml().toString('base64url'),
      });
    return Response.json(
      path.includes('pageToken=next')
        ? { messages: [{ id: 'two' }] }
        : { messages: [{ id: 'one' }], nextPageToken: 'next' }
    );
  };
  const client = gmailClient(
    { client_id: 'fiction', refresh_token: 'fiction' },
    fetcher
  );
  const results = [];
  for await (const raw of client.messages()) results.push(raw);
  assert.equal(results.length, 2);
  assert.ok(paths.some((path) => path.includes('pageToken=next')));
  let messageRead = false;
  const wrong = gmailClient(
    { client_id: 'fiction', refresh_token: 'fiction' },
    async (url: string | URL | Request) => {
      if (String(url).includes('oauth2'))
        return Response.json({ access_token: 'fiction' });
      if (String(url).endsWith('profile'))
        return Response.json({ emailAddress: 'other@example.test' });
      messageRead = true;
      return Response.json({});
    }
  );
  await assert.rejects(async () => {
    for await (const _ of wrong.messages()) {
    }
  }, /wrong_gmail_account/);
  assert.equal(messageRead, false);
});

test('Gmail backs off on quota 403 and skips successfully checkpointed messages', async () => {
  const waits: number[] = [];
  const reads: string[] = [];
  let limited = true;
  const client = gmailClient(
    { client_id: 'fixture', refresh_token: 'fixture' },
    async (url: string | URL | Request) => {
      const path = String(url);
      if (path.includes('oauth2'))
        return Response.json({ access_token: 'fixture' });
      if (limited) {
        limited = false;
        return Response.json(
          { error: { errors: [{ reason: 'rateLimitExceeded' }] } },
          { status: 403, headers: { 'Retry-After': '30' } }
        );
      }
      if (path.endsWith('/profile'))
        return Response.json({ emailAddress: CONTACTS_ACCOUNT_EMAIL });
      if (path.includes('format=raw')) {
        reads.push(path);
        return Response.json({
          labelIds: ['SENT'],
          raw: eml().toString('base64url'),
        });
      }
      return Response.json({ messages: [{ id: 'processed' }, { id: 'new' }] });
    },
    async (ms: number) => {
      waits.push(ms);
    }
  );
  const results = [];
  for await (const message of client.messages({
    seenIds: new Set(['processed']),
  }))
    results.push(message);
  assert.deepEqual(waits, [30000]);
  assert.equal(reads.length, 1);
  assert.equal(results[0]!.gmailId, 'new');
  assert.deepEqual(results[0]!.raw, eml());
});

test('Gmail downloads are bounded to four concurrent reads and pause between batches', async () => {
  let active = 0;
  let peak = 0;
  const waits: number[] = [];
  const client = gmailClient(
    { client_id: 'fixture', refresh_token: 'fixture' },
    async (url: string | URL | Request) => {
      const path = String(url);
      if (path.includes('oauth2'))
        return Response.json({ access_token: 'fixture' });
      if (path.endsWith('/profile'))
        return Response.json({ emailAddress: CONTACTS_ACCOUNT_EMAIL });
      if (path.includes('format=raw')) {
        peak = Math.max(peak, ++active);
        await new Promise<void>((resolve) => setImmediate(resolve));
        active--;
        return Response.json({
          labelIds: ['SENT'],
          raw: eml().toString('base64url'),
        });
      }
      return Response.json({
        messages: Array.from({ length: 9 }, (_, id) => ({ id: String(id) })),
      });
    },
    async (ms: number) => {
      waits.push(ms);
    }
  );
  let count = 0;
  for await (const message of client.messages()) {
    assert.ok(message.raw.length);
    count++;
  }
  assert.equal(count, 9);
  assert.equal(peak, 4);
  assert.deepEqual(waits, [1000, 1000]);
});
