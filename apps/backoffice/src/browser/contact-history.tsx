import { CalendarDaysIcon } from '@heroicons/react/20/solid';
import type { GoogleContact } from '../contact-types';
import { capitalizeName } from '../contact-identity';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

export function ContactHistory({ contact }: { contact: GoogleContact }) {
  if (!contact.history) {
    return (
      <p className="text-sm text-zinc-500">
        L’historique des rendez-vous n’est pas disponible pour cette fiche.
      </p>
    );
  }
  const events = [...contact.history]
    .filter((event) => Number.isFinite(Date.parse(event.date)))
    .sort(
      (a, b) =>
        Date.parse(b.date) - Date.parse(a.date) || a.id.localeCompare(b.id)
    );
  if (!events.length) {
    return (
      <p className="text-sm text-zinc-500">Aucun rendez-vous enregistré.</p>
    );
  }
  return (
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
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-zinc-900">
                Rendez-vous
              </span>
              {event.status === 'canceled' ? (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                  Annulé
                </span>
              ) : Date.parse(event.date) > Date.now() ? (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                  À venir
                </span>
              ) : null}
            </div>
            <time
              dateTime={event.date}
              className="mt-1 block text-sm text-zinc-500"
            >
              {dateFormat.format(new Date(event.date))}
            </time>
            {event.animal && (
              <p className="mt-1 text-sm text-zinc-700">
                {capitalizeName(event.animal)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
