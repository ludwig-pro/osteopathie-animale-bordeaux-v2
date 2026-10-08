import { useEffect, useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/20/solid';
import type { ConsultationReport } from '../contact-types';
import { PdfViewer } from './pdf-viewer';

const reportDate = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeZone: 'Europe/Paris',
});

export function LatestConsultationReport({
  contactId,
  contactName,
  refreshedAt,
  loadReports,
}: {
  contactId: string;
  contactName: string;
  refreshedAt: number | undefined;
  loadReports: (
    id: string,
    signal?: AbortSignal
  ) => Promise<{ reports: ConsultationReport[] }>;
}) {
  const [latest, setLatest] = useState<ConsultationReport | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [viewedReport, setViewedReport] = useState<ConsultationReport | null>(
    null
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadReports(contactId, controller.signal)
      .then(({ reports }) => {
        if (controller.signal.aborted) return;
        setLatest(
          reports
            .filter((report) => Number.isFinite(Date.parse(report.date)))
            .sort(
              (a, b) =>
                Date.parse(b.date) - Date.parse(a.date) ||
                a.id.localeCompare(b.id)
            )[0] ?? null
        );
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [contactId, refreshedAt, loadReports]);

  return (
    <>
      <div className="flex items-center gap-3">
        {latest && (
          <button
            type="button"
            onClick={() => setViewedReport(latest)}
            aria-label={`Ouvrir le dernier compte rendu PDF de ${contactName}, envoyé le ${reportDate.format(new Date(latest.date))}`}
            title={latest.filename}
            className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-green-900 transition-colors hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <DocumentTextIcon className="size-5" aria-hidden="true" />
            <span
              className="text-[9px] font-bold tracking-wide"
              aria-hidden="true"
            >
              PDF
            </span>
          </button>
        )}
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-white">
            Dernier compte rendu de la fiche
          </h4>
          {latest ? (
            <p className="mt-1 text-xs text-green-100">
              Envoyé le{' '}
              <time dateTime={latest.date}>
                {reportDate.format(new Date(latest.date))}
              </time>{' '}
              · {contactName}
            </p>
          ) : (
            <p
              className="mt-1 text-xs text-green-100"
              role={status === 'loading' ? 'status' : undefined}
            >
              {status === 'loading'
                ? 'Chargement du compte rendu…'
                : status === 'error'
                  ? 'Compte rendu momentanément indisponible.'
                  : 'Aucun compte rendu disponible.'}
            </p>
          )}
          {latest && status === 'error' && (
            <p className="mt-1 text-xs text-green-100">
              Actualisation indisponible. Dernier document connu affiché.
            </p>
          )}
        </div>
      </div>
      {viewedReport && (
        <PdfViewer
          key={viewedReport.id}
          report={viewedReport}
          onClose={() => setViewedReport(null)}
        />
      )}
    </>
  );
}
