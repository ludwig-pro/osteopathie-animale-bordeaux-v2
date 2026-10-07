import { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  MapPinIcon,
} from '@heroicons/react/20/solid';
import type { NextAppointmentView } from '../calendar-types';
import type { ContactsModel } from './contacts-model';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Subheading } from './ui/heading';
import { Text } from './ui/text';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});
const messages = {
  empty: 'Aucun rendez-vous à venir dans l’agenda.',
  not_connected: 'L’agenda d’Agathe n’est pas encore connecté.',
  unavailable: 'Impossible de lire l’agenda pour le moment.',
  ready: '',
};

export function NextAppointment({ model }: { model: ContactsModel }) {
  const [data, setData] = useState<NextAppointmentView | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function load() {
      if (loading || controller.signal.aborted) return;
      loading = true;
      try {
        const result = await model.nextAppointment(controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch {
        if (!controller.signal.aborted)
          setData({
            state: 'unavailable',
            appointment: null,
            checkedAt: null,
            demo: false,
          });
      } finally {
        loading = false;
      }
    }
    const refreshVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    void load();
    const timer = setInterval(refreshVisible, 60000);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [model.nextAppointment]);
  const appointment = data?.appointment;
  const start = appointment ? new Date(appointment.startsAt) : null;
  const end = appointment ? new Date(appointment.endsAt) : null;
  const sameDay =
    start && end && dateFormat.format(start) === dateFormat.format(end);

  return (
    <section
      aria-label="Prochain rendez-vous"
      className="mt-8 rounded-xl border border-green-900/15 bg-green-50/50 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDaysIcon
            className="size-6 text-green-800"
            aria-hidden="true"
          />
          <Subheading>Prochain rendez-vous</Subheading>
        </div>
        <span className="text-xs text-green-900/70">Google Calendar</span>
      </div>
      {!data && (
        <Text role="status" className="mt-4">
          Lecture de l’agenda…
        </Text>
      )}
      {data && messages[data.state] && (
        <Text role="status" className="mt-4">
          {messages[data.state]}
        </Text>
      )}
      {data?.copiedAt && (
        <Text className="mt-3 text-xs">
          Copie de production du {dateFormat.format(new Date(data.copiedAt))}.
        </Text>
      )}
      {appointment && start && end && (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {data?.demo && <Badge color="zinc">Exemple fictif</Badge>}
              {appointment.status === 'tentative' && (
                <Badge color="amber">À confirmer</Badge>
              )}
            </div>
            <p className="mt-2 break-words text-lg font-semibold text-zinc-950">
              {appointment.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              <time dateTime={appointment.startsAt}>
                {dateFormat.format(start)} à {timeFormat.format(start)}
              </time>
              {' – '}
              <time dateTime={appointment.endsAt}>
                {sameDay
                  ? timeFormat.format(end)
                  : `${dateFormat.format(end)} à ${timeFormat.format(end)}`}
              </time>
            </p>
            {appointment.location && (
              <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-zinc-600">
                <MapPinIcon
                  className="mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <span className="break-words">{appointment.location}</span>
              </p>
            )}
          </div>
          {appointment.url && (
            <Button
              outline
              href={appointment.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir dans l’agenda
              <ArrowTopRightOnSquareIcon />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
