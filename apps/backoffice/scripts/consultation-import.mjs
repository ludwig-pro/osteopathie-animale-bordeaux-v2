// Operator-only importer. Does not run in the Worker or modify Gmail/Contacts.
import { simpleParser } from 'mailparser';
import { createHash, randomUUID } from 'node:crypto';
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  chmodSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { CONTACTS_ACCOUNT_EMAIL } from '../src/config.ts';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const email = (value) => value.trim().toLowerCase();
const reportName = (value) => /\bcompte[\s_-]*rendu\b|^cr[\s_-]/i.test(value);
const addresses = (value) =>
  (Array.isArray(value) ? value : [value])
    .flatMap((group) => group?.value ?? [])
    .map((item) => email(item.address ?? ''))
    .filter(Boolean);

export function matchRecipients(recipients, contacts) {
  const targets = [...new Set(recipients.map(email))].filter(
    (value) => value !== CONTACTS_ACCOUNT_EMAIL
  );
  if (!targets.length) return { contactId: null, status: 'unmatched' };
  const matches = targets.map((target) =>
    contacts.filter((contact) =>
      contact.emails.some((value) => email(value) === target)
    )
  );
  if (matches.every((items) => items.length === 0))
    return { contactId: null, status: 'unmatched' };
  if (
    matches.some((items) => items.length !== 1) ||
    new Set(matches.map((items) => items[0].id)).size !== 1
  )
    return { contactId: null, status: 'ambiguous' };
  return { contactId: matches[0][0].id, status: 'linked' };
}

export async function parseReportMessage(raw) {
  if (raw.length > 50 * 1024 * 1024) throw new Error('message_too_large');
  const message = await simpleParser(raw, {
    skipHtmlToText: true,
    skipTextToHtml: true,
    skipImageLinks: true,
  });
  const senders = addresses(message.from);
  if (senders.length !== 1 || senders[0] !== CONTACTS_ACCOUNT_EMAIL) return [];
  if (
    !message.messageId ||
    !message.date ||
    !Number.isFinite(message.date.getTime())
  )
    throw new Error('invalid_message_metadata');
  const recipients = addresses(message.to);
  const pdfs = message.attachments.filter((a) =>
    /\.pdf$/i.test(a.filename ?? '')
  );
  const reports = [];
  for (const [index, attachment] of message.attachments.entries()) {
    const filename = attachment.filename ?? '';
    if (!/\.pdf$/i.test(filename)) continue;
    if (
      !reportName(filename) &&
      !(
        reportName(message.subject ?? '') &&
        pdfs.length === 1 &&
        !/facture|devis/i.test(filename)
      )
    )
      continue;
    if (
      attachment.content.length > 20 * 1024 * 1024 ||
      attachment.content.subarray(0, 5).toString() !== '%PDF-'
    )
      throw new Error('invalid_report_pdf');
    reports.push({
      id: hash(`${CONTACTS_ACCOUNT_EMAIL}\0${message.messageId}\0${index}`),
      account: CONTACTS_ACCOUNT_EMAIL,
      messageId: message.messageId,
      attachmentIndex: index,
      filename,
      sentAt: message.date.toISOString(),
      recipients,
      sha256: hash(attachment.content),
      size: attachment.content.length,
      content: attachment.content,
    });
  }
  return reports;
}

export function importReport(
  report,
  contacts,
  sqlite,
  directory,
  apply = false
) {
  const match = matchRecipients(report.recipients, contacts);
  const previous = sqlite
    .prepare('SELECT sha256, contact_id FROM consultation_reports WHERE id = ?')
    .get(report.id);
  if (previous && previous.sha256 !== report.sha256)
    throw new Error('source_report_changed');
  // Previously linked originals keep their historical owner even if an email is later reassigned.
  const preserved = previous?.contact_id
    ? { contactId: previous.contact_id, status: 'linked' }
    : match;
  if (apply) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    const path = join(directory, `${report.sha256}.pdf`);
    if (existsSync(path)) {
      if (hash(readFileSync(path)) !== report.sha256)
        throw new Error('stored_report_corrupted');
    } else {
      const temporary = join(directory, `.${randomUUID()}.tmp`);
      try {
        writeFileSync(temporary, report.content, { flag: 'wx', mode: 0o600 });
        renameSync(temporary, path);
      } finally {
        rmSync(temporary, { force: true });
      }
    }
    // Commit metadata only after the complete original is safely stored.
    sqlite
      .prepare(
        `INSERT INTO consultation_reports
      (id,account,message_id,attachment_index,filename,sent_at,recipients,sha256,size,contact_id,match_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      contact_id=excluded.contact_id, match_status=excluded.match_status`
      )
      .run(
        report.id,
        report.account,
        report.messageId,
        report.attachmentIndex,
        report.filename,
        report.sentAt,
        JSON.stringify(report.recipients),
        report.sha256,
        report.size,
        preserved.contactId,
        preserved.status
      );
  }
  return { status: preserved.status, existing: Boolean(previous) };
}
