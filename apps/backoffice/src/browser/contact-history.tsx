import { CalendarDaysIcon, DocumentTextIcon } from '@heroicons/react/20/solid';
import { useEffect, useState } from 'react';
import type { ConsultationReport } from '../contact-types';
import type { GoogleContact } from '../contact-types';
import { capitalizeName } from '../contact-identity';
import { PdfViewer } from './pdf-viewer';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

export function ContactHistory({
  contact,
  loadReports,
}: {
  contact: GoogleContact;
  loadReports: (id: string) => Promise<{ reports: ConsultationReport[] }>;
}) {
  const [viewedReport, setViewedReport] = useState<ConsultationReport | null>(
    null
  );
  const [reports, setReports] = useState<ConsultationReport[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    void loadReports(contact.id)
      .then(({ reports }) => {
        if (active) {
          setReports(reports);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [contact.id, loadReports, retry]);
  const events = [...(contact.history ?? []), ...reports]
    .filter((event) => Number.isFinite(Date.parse(event.date)))
    .sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id)
    );
  return (
    <div>
      {!contact.history && (
        <p className="mb-4 text-sm text-zinc-500">
          L’historique des rendez-vous n’est pas disponible pour cette fiche.
        </p>
      )}
      {status === 'loading' && (
        <p role="status" className="mb-4 text-sm text-zinc-500">
          Chargement des comptes rendus…
        </p>
      )}
      {status === 'error' && (
        <p role="alert" className="mb-4 text-sm text-amber-800">
          Impossible de charger les comptes rendus.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => setRetry(retry + 1)}
          >
            Réessayer
          </button>
        </p>
      )}
      {!events.length && status === 'ready' && (
        <p className="text-sm text-zinc-500">Aucune interaction enregistrée.</p>
      )}
      <ol aria-label="Historique des interactions" className="space-y-0">
        {events.map((event, index) => (
          <li key={event.id} className="relative flex gap-3 pb-7 last:pb-0">
            {index < events.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-8 bottom-0 left-4 w-px bg-zinc-200"
              />
            )}
            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
              {event.type === 'consultation-report' ? (
                <DocumentTextIcon className="size-4" aria-hidden="true" />
              ) : (
                <CalendarDaysIcon className="size-4" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">
                  {event.type === 'consultation-report'
                    ? 'Compte rendu de consultation'
                    : 'Rendez-vous'}
                </span>
                {event.type === 'appointment' &&
                  (event.status === 'canceled' ? (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                      Annulé
                    </span>
                  ) : Date.parse(event.date) > Date.now() ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                      À venir
                    </span>
                  ) : null)}
              </div>
              <time
                dateTime={event.date}
                className="mt-1 block text-sm text-zinc-500"
              >
                {event.type === 'consultation-report' && 'Envoyé le '}
                {dateFormat.format(new Date(event.date))}
              </time>
              {event.type === 'consultation-report' && (
                <button
                  type="button"
                  onClick={() => setViewedReport(event)}
                  className="mt-2 block break-words text-left text-sm text-emerald-800 underline underline-offset-2"
                >
                  Voir le PDF — {event.filename}
                </button>
              )}
              {event.type === 'appointment' && event.animal && (
                <p className="mt-1 text-sm text-zinc-700">
                  {capitalizeName(event.animal)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {viewedReport && (
        <PdfViewer
          key={viewedReport.id}
          report={viewedReport}
          onClose={() => setViewedReport(null)}
        />
      )}
    </div>
  );
}
