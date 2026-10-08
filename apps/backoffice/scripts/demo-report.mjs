// A fictitious, in-memory PDF for the local interface preview only.
import { createHash } from 'node:crypto';

export function createDemoReport(contact) {
  const consultation = new Date(contact.lastAppointment);
  const sentAt = new Date(consultation.getTime() + 27 * 60 * 60 * 1000);
  const date = (value) =>
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(value);
  const literal = (value) => value.replace(/([\\()])/g, '\\$1');
  const text = (value, x, y, size = 11, bold = false) =>
    `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${literal(value)}) Tj ET`;
  const content = [
    '0.98 0.97 0.94 rg 0 0 595 842 re f',
    '0.09 0.24 0.19 rg 0 688 595 154 re f',
    '1 1 1 rg',
    text('COMPTE RENDU DE CONSULTATION', 48, 784, 18, true),
    text('Oslo - Chien', 48, 743, 25, true),
    text('Document fictif pour la démonstration du backoffice', 48, 716, 10),
    '0.09 0.24 0.19 rg',
    text(`Client : ${contact.name}`, 48, 649, 12, true),
    text(`Consultation du ${date(consultation)}`, 48, 623),
    text(`Compte rendu envoyé le ${date(sentAt)}`, 48, 602),
    '0.80 0.85 0.81 RG 48 579 m 547 579 l S',
    text('Motif de la visite', 48, 546, 14, true),
    text(
      'Suivi de confort et de mobilité après la reprise des promenades.',
      48,
      521
    ),
    text('Observations fictives', 48, 470, 14, true),
    text(
      'Oslo est calme et disponible au cours de cette séance de démonstration.',
      48,
      445
    ),
    text('La mobilité paraît plus souple en fin de séance.', 48, 424),
    text('Points à reprendre au prochain rendez-vous', 48, 373, 14, true),
    text(
      'Échanger sur les observations du propriétaire depuis la dernière visite.',
      48,
      348
    ),
    text(
      'Faire le point sur le confort dans les activités habituelles.',
      48,
      327
    ),
    '0.89 0.92 0.87 rg 48 170 499 88 re f',
    '0.09 0.24 0.19 rg',
    text('APERÇU - DONNÉES ENTIÈREMENT FICTIVES', 64, 231, 11, true),
    text('Ce document sert uniquement à tester la lecture des PDF.', 64, 207),
    text('Il ne correspond à aucune consultation réelle.', 64, 188),
    text(
      "La date affichée dans le backoffice est la date d'envoi du compte rendu.",
      48,
      93,
      9
    ),
    text('Démonstration locale', 48, 49, 9),
    text('1 / 1', 522, 49, 9),
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
  ];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, 'latin1'));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = Buffer.byteLength(document, 'latin1');
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const pdf = Buffer.from(document, 'latin1');
  return {
    contactId: contact.id,
    report: {
      id: createHash('sha256').update(pdf).digest('hex'),
      type: /** @type {const} */ ('consultation-report'),
      date: sentAt.toISOString(),
      filename: 'compte-rendu-oslo-demo.pdf',
      size: pdf.length,
    },
    pdf,
  };
}

export function demoConsultationPdf(document, id, method = 'GET') {
  if (!['GET', 'HEAD'].includes(method))
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  if (id !== document.report.id)
    return Response.json({ error: 'report_not_found' }, { status: 404 });
  return new Response(method === 'HEAD' ? null : document.pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(document.pdf.length),
      'Content-Disposition':
        'attachment; filename="compte-rendu-oslo-demo.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
