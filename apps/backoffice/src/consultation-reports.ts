import type { Env } from './config.ts';
import { ContactsError } from './contacts.ts';

import type { ConsultationReport } from './contact-types.ts';

export async function consultationReports(contactId: string, env: Env) {
  if (!/^people\/[\w-]+$/.test(contactId))
    throw new ContactsError(400, 'invalid_contact');
  if (!env.DB) throw new ContactsError(503, 'reports_unavailable');
  // Resending the same original produces one timeline entry per contact.
  // Every source message remains in the database for provenance.
  const { results } = await env.DB.prepare(
    `SELECT id, filename, sent_at AS date, size FROM (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY sha256 ORDER BY sent_at, id) AS occurrence
      FROM consultation_reports WHERE contact_id = ? AND match_status = 'linked'
    ) WHERE occurrence = 1 ORDER BY sent_at DESC, id`
  )
    .bind(contactId)
    .all<Omit<ConsultationReport, 'type'>>();
  return {
    reports: results.map((report) => ({
      ...report,
      type: 'consultation-report' as const,
    })),
  };
}

export async function consultationPdf(id: string, env: Env): Promise<Response> {
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new ContactsError(404, 'report_not_found');
  if (!env.DB || !env.REPORTS)
    throw new ContactsError(503, 'reports_unavailable');
  const report = await env.DB.prepare(
    "SELECT filename, sha256 FROM consultation_reports WHERE id = ? AND match_status = 'linked'"
  )
    .bind(id)
    .first<{ filename: string; sha256: string }>();
  if (!report || !/^[a-f0-9]{64}$/.test(report.sha256))
    throw new ContactsError(404, 'report_not_found');
  const object = await env.REPORTS.get(`${report.sha256}.pdf`);
  if (!object) throw new ContactsError(404, 'report_not_found');
  const filename = report.filename.replace(/[\x00-\x1f\x7f/\\]/g, '_');
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="compte-rendu.pdf"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))}`,
    },
  });
}
