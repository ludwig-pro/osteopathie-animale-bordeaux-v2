import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  MapPinIcon,
} from '@heroicons/react/20/solid';
import type { GoogleContact } from '../contact-types';
import {
  AGENDA_TIME_ZONE,
  appointmentsForDay,
  buildAgenda,
  nextAppointment,
  parisDay,
  shiftDay,
  shiftMonth,
  type AgendaAppointment,
} from './agenda-model';
import { AgendaCalendar, calendarDate, dayFormat } from './agenda-calendar';
import { contactName, type ContactsModel } from './contacts-model';
import { Notice } from './common';
import { LatestConsultationReport } from './latest-consultation-report';
import { useAgendaRefresh } from './use-agenda-refresh';
import { useCalendarAgenda } from './use-calendar-agenda';
import { Button } from './ui/button';

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: AGENDA_TIME_ZONE,
});
const shortDayFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const time = (appointment: AgendaAppointment) =>
  timeFormat.format(appointment.startsAt);
const animalName = (appointment: AgendaAppointment) =>
  appointment.animal || appointment.title || 'Animal non renseigné';

function AppointmentVenue({ venue }: { venue: AgendaAppointment['venue'] }) {
  const Icon =
    venue === 'home'
      ? HomeIcon
      : venue === 'practice'
        ? BuildingOffice2Icon
        : MapPinIcon;
  const label =
    venue === 'home'
      ? 'Rendez-vous à domicile'
      : venue === 'practice'
        ? 'Rendez-vous au cabinet'
        : 'Lieu non renseigné';
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="mt-1 shrink-0 text-zinc-500"
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return now;
}

function NextAppointment({
  appointment,
  appointments,
  now,
  onContact,
  loadReports,
  refreshedAt,
}: {
  appointment: AgendaAppointment;
  appointments: AgendaAppointment[];
  now: number;
  onContact: (contact: GoogleContact) => void;
  loadReports: ContactsModel['consultationReports'];
  refreshedAt: number | undefined;
}) {
  const sameDay = appointment.day === parisDay(now);
  const minutes = Math.ceil((appointment.startsAt - now) / 60_000);
  const previousAppointments = appointments.filter(
    (item) =>
      item.startsAt < now &&
      (!appointment.animal ||
        item.animal.toLocaleLowerCase('fr') ===
          appointment.animal.toLocaleLowerCase('fr')) &&
      item.contacts.some((contact) =>
        appointment.contacts.some((owner) => owner.id === contact.id)
      )
  );
  const previous = previousAppointments.at(-1);
  return (
    <section
      aria-labelledby="next-appointment-title"
      className="overflow-hidden rounded-2xl bg-green-900 text-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4 sm:px-7">
        <h2
          id="next-appointment-title"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <span
            className="size-2 rounded-full bg-green-300"
            aria-hidden="true"
          />
          Prochain rendez-vous
        </h2>
        <span className="text-xs text-green-100">
          {sameDay
            ? minutes <= 1
              ? 'Dans moins d’une minute'
              : minutes < 60
                ? `Dans ${minutes} min`
                : 'Aujourd’hui'
            : shortDayFormat.format(calendarDate(appointment.day))}
        </span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <h3 className="break-words font-display text-3xl leading-tight sm:text-4xl">
              {animalName(appointment)}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-green-100">
              {appointment.contacts.map((contact) => {
                const phone = contact.phones[0];
                return (
                  <p key={contact.id} className="break-words">
                    Avec {contactName(contact)}
                    {phone && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <a
                          href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                          className="rounded whitespace-nowrap hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                        >
                          {phone}
                        </a>
                      </>
                    )}
                  </p>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center">
            <time
              dateTime={appointment.date}
              className="block text-3xl font-medium tracking-tight tabular-nums"
            >
              {time(appointment)}
            </time>
          </div>
        </div>
        {appointment.calendar?.location && (
          <p className="mt-3 break-words text-sm text-green-100">
            {appointment.calendar.location}
          </p>
        )}
        {appointment.calendar?.status === 'tentative' && (
          <p className="mt-2 text-xs text-green-100">À confirmer</p>
        )}
        {appointment.contacts.length > 0 && (
          <section
            aria-label="Repères du suivi"
            className="mt-5 rounded-xl border border-white/15 bg-white/5 px-4 py-3"
          >
            <p className="text-sm/6 text-white">
              {previous ? (
                <>
                  {previousAppointments.length} rendez-vous antérieur
                  {previousAppointments.length > 1 ? 's' : ''}
                  {appointment.animal
                    ? ` pour ${appointment.animal}`
                    : ' sur cette fiche'}
                  . Dernier le{' '}
                  {shortDayFormat.format(calendarDate(previous.day))}{' '}
                  {calendarDate(previous.day).getUTCFullYear()}.
                </>
              ) : appointment.contacts.some((contact) => !contact.history) ? (
                'L’historique du suivi n’est pas encore disponible.'
              ) : (
                `Aucun rendez-vous antérieur retrouvé${appointment.animal ? ` pour ${appointment.animal}` : ' sur cette fiche'}.`
              )}
            </p>
          </section>
        )}
        <div className="mt-4 space-y-4">
          {appointment.contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4"
            >
              <div className="min-w-0 flex-1 basis-64">
                <LatestConsultationReport
                  contactId={contact.id}
                  contactName={contactName(contact)}
                  refreshedAt={refreshedAt}
                  loadReports={loadReports}
                />
              </div>
              <Button
                color="white"
                className="ml-auto shrink-0"
                onClick={() => onContact(contact)}
              >
                {appointment.contacts.length > 1
                  ? `Fiche de ${contactName(contact)}`
                  : 'Ouvrir la fiche client'}
                <ArrowRightIcon />
              </Button>
            </div>
          ))}
        </div>
        {appointment.calendar?.url && (
          <div className="mt-4 flex justify-end">
            <Button
              color="white"
              href={appointment.calendar.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Voir dans l’agenda <ArrowTopRightOnSquareIcon />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function DayAgendaHeader({
  day,
  today,
  onSelect,
}: {
  day: string;
  today: string;
  onSelect: (day: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div aria-live="polite">
        <h2
          id="day-agenda-title"
          className="text-lg font-semibold tracking-tight text-zinc-950"
        >
          {day === today
            ? 'Le fil de votre journée'
            : shortDayFormat.format(calendarDate(day)) +
              ' ' +
              calendarDate(day).getUTCFullYear()}
        </h2>
      </div>
      <div className="flex items-center gap-1">
        <Button
          plain
          aria-label="Jour précédent"
          onClick={() => onSelect(shiftDay(day, -1))}
        >
          <ChevronLeftIcon />
        </Button>
        <Button outline onClick={() => onSelect(today)}>
          Aujourd’hui
        </Button>
        <Button
          plain
          aria-label="Jour suivant"
          onClick={() => onSelect(shiftDay(day, 1))}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

function DayAgenda({
  appointments,
  now,
  nextId,
  available,
  onContact,
}: {
  appointments: AgendaAppointment[];
  now: number;
  nextId?: string;
  available: boolean;
  onContact: (contact: GoogleContact) => void;
}) {
  return (
    <section aria-labelledby="day-agenda-title" className="mt-5">
      {appointments.length ? (
        <ol className="divide-y divide-zinc-950/5 rounded-xl border border-zinc-950/10">
          {appointments.map((appointment) => {
            const past = appointment.startsAt < now;
            const next = appointment.id === nextId;
            return (
              <li
                key={appointment.id}
                className={`flex gap-4 px-4 py-5 first:rounded-t-xl last:rounded-b-xl sm:gap-5 sm:px-5 ${next ? 'bg-green-50' : ''}`}
              >
                <div className="w-12 shrink-0 pt-0.5">
                  <time
                    dateTime={appointment.date}
                    className={`text-sm font-semibold tabular-nums ${past ? 'text-zinc-500' : 'text-zinc-900'}`}
                  >
                    {time(appointment)}
                  </time>
                  <span
                    aria-hidden="true"
                    className={`mt-3 block size-2 rounded-full ${next ? 'bg-green-600' : past ? 'bg-zinc-300' : 'bg-green-300'}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3
                      className={`break-words text-base font-semibold ${past ? 'text-zinc-600' : 'text-zinc-950'}`}
                    >
                      {animalName(appointment)}
                    </h3>
                    {next ? (
                      <span className="text-xs font-medium text-green-800">
                        À suivre
                      </span>
                    ) : past ? (
                      <span className="text-xs text-zinc-500">
                        Heure passée
                      </span>
                    ) : null}
                  </div>
                  {appointment.contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => onContact(contact)}
                      className="mt-1 flex max-w-full items-center gap-2 rounded text-left text-sm/6 text-zinc-500 hover:text-green-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700"
                      aria-label={`Ouvrir la fiche de ${contactName(contact)}`}
                    >
                      <span className="break-words">
                        {contactName(contact)}
                      </span>
                      <ArrowRightIcon
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                  {!appointment.contacts.length &&
                    appointment.calendar?.url && (
                      <a
                        href={appointment.calendar.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-2 rounded text-sm/6 text-zinc-500 hover:text-green-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700"
                      >
                        Voir dans l’agenda{' '}
                        <ArrowTopRightOnSquareIcon
                          className="size-4"
                          aria-hidden="true"
                        />
                      </a>
                    )}
                </div>
                <AppointmentVenue venue={appointment.venue} />
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-9 text-center">
          <CalendarDaysIcon
            className="mx-auto size-7 text-zinc-400"
            aria-hidden="true"
          />
          <h3 className="mt-3 text-sm font-medium text-zinc-800">
            {available
              ? 'Aucun rendez-vous connu pour cette journée'
              : 'Votre agenda n’est pas encore disponible'}
          </h3>
          <p className="mt-1 text-sm/6 text-zinc-500">
            {available
              ? 'Choisissez une autre date dans le calendrier.'
              : 'Les rendez-vous apparaîtront ici lorsque les historiques seront disponibles.'}
          </p>
        </div>
      )}
    </section>
  );
}

export function HomePage({
  model,
  refreshEnabled,
  onContact,
}: {
  model: ContactsModel;
  refreshEnabled: boolean;
  onContact: (contact: GoogleContact) => void;
}) {
  useAgendaRefresh({
    refresh: model.refresh,
    loading: model.loading,
    updatedAt: model.updatedAt,
    enabled: refreshEnabled,
  });
  const now = useNow();
  const today = parisDay(now);
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [browsedMonth, setBrowsedMonth] = useState<string | null>(null);
  const selectedDay = chosenDay ?? today;
  const month = browsedMonth ?? shiftMonth(selectedDay, 0);
  const calendar = useCalendarAgenda(model, today, month, refreshEnabled);
  const selectDay = (day: string) => {
    setChosenDay(day === today ? null : day);
    setBrowsedMonth(null);
  };
  const agenda = useMemo(
    () => buildAgenda(model.contacts, calendar.appointments),
    [model.contacts, calendar.appointments]
  );
  const available =
    model.ready &&
    ((model.appointmentsAvailable && agenda.coverage !== 'unavailable') ||
      (calendar.state === 'ready' && !calendar.loading) ||
      agenda.appointments.length > 0);
  const appointments = useMemo(
    () => (available ? agenda.appointments : []),
    [available, agenda.appointments]
  );
  const todayAppointments = appointmentsForDay(appointments, today);
  const selectedAppointments = appointmentsForDay(appointments, selectedDay);
  const upcoming = todayAppointments.filter(
    (appointment) => appointment.startsAt >= now
  );
  const next = nextAppointment(appointments, now);
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const appointment of appointments)
      counts.set(appointment.day, (counts.get(appointment.day) ?? 0) + 1);
    return counts;
  }, [appointments]);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xs font-medium tracking-widest text-green-800 uppercase">
            {dayFormat.format(calendarDate(today))}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button outline href="#agenda-calendar" className="xl:hidden">
            <CalendarDaysIcon />
            Calendrier
          </Button>
        </div>
      </header>
      {model.error && (
        <div className="mt-5">
          <Notice>
            {model.error}
            {model.ready &&
              ' Les dernières données chargées restent affichées.'}
          </Notice>
        </div>
      )}
      {model.ready && !calendar.loading && calendar.state !== 'ready' && (
        <div className="mt-5">
          <Notice>
            {calendar.state === 'not_connected'
              ? 'Google Calendar n’est pas connecté : les rendez-vous à domicile ne sont pas disponibles.'
              : 'La lecture de Google Calendar est indisponible ou la copie ne couvre pas cette période. Les rendez-vous à domicile peuvent manquer.'}
          </Notice>
        </div>
      )}
      {model.ready &&
        (!available ||
          !model.appointmentsAvailable ||
          agenda.coverage === 'partial') && (
          <div className="mt-5">
            <Notice>
              {!available
                ? 'Les historiques de rendez-vous ne sont pas disponibles. Une nouvelle tentative sera effectuée automatiquement.'
                : 'Certains historiques ne sont pas disponibles : l’agenda peut être incomplet.'}
            </Notice>
          </div>
        )}
      <dl className="mt-5 grid grid-cols-3 divide-x divide-zinc-950/10 border-y border-zinc-950/10 py-3">
        {[
          {
            label: 'RDV aujourd’hui',
            value: todayAppointments.length,
          },
          {
            label: 'À venir',
            value: upcoming.length,
          },
          {
            label: 'Dernier horaire',
            value: todayAppointments.length
              ? time(todayAppointments[todayAppointments.length - 1]!)
              : '—',
          },
        ].map((stat, index) => (
          <div
            key={stat.label}
            className={`flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 ${index ? 'px-3 sm:px-5' : 'pr-3 sm:pr-5'}`}
          >
            <dt className="text-xs/5 font-medium text-zinc-500 sm:text-sm">
              {stat.label}
            </dt>
            <dd className="text-xl font-medium tracking-tight text-zinc-950 tabular-nums">
              {available ? stat.value : '—'}
            </dd>
          </div>
        ))}
      </dl>
      {!model.ready && model.loading ? (
        <div
          role="status"
          className="mt-7 rounded-2xl bg-zinc-50 px-6 py-16 text-center text-sm text-zinc-500"
        >
          Préparation de votre journée…
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="min-w-0">
            <DayAgendaHeader
              day={selectedDay}
              today={today}
              onSelect={selectDay}
            />
            {next ? (
              <NextAppointment
                key={next.id}
                appointment={next}
                appointments={appointments}
                now={now}
                onContact={onContact}
                loadReports={model.consultationReports}
                refreshedAt={model.updatedAt?.getTime()}
              />
            ) : (
              <section className="rounded-2xl bg-green-50 p-6 sm:p-7">
                <CalendarDaysIcon
                  className="size-6 text-green-700"
                  aria-hidden="true"
                />
                <h2 className="mt-4 font-display text-2xl text-green-900">
                  {!available
                    ? 'Votre journée se prépare ici.'
                    : todayAppointments.length
                      ? 'Les horaires du jour sont derrière vous.'
                      : 'Une journée sans rendez-vous connu.'}
                </h2>
                <p className="mt-2 text-sm/6 text-green-800">
                  {!available
                    ? 'Retrouvez bientôt votre prochaine consultation et les informations pour la préparer.'
                    : 'Aucun prochain rendez-vous dans les données disponibles. Le calendrier reste accessible pour retrouver les autres journées.'}
                </p>
              </section>
            )}
            <DayAgenda
              appointments={selectedAppointments}
              now={now}
              nextId={next?.id}
              available={available}
              onContact={onContact}
            />
          </div>
          <aside className="min-w-0">
            <AgendaCalendar
              selectedDay={selectedDay}
              today={today}
              counts={dayCounts}
              onSelect={selectDay}
              month={month}
              onMonthChange={setBrowsedMonth}
            />
          </aside>
        </div>
      )}
    </>
  );
}
