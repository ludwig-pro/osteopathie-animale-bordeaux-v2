import type { GoogleContact } from '../contact-types';
import type { CalendarAppointment } from '../calendar-types';

export const AGENDA_TIME_ZONE = 'Europe/Paris';

export interface AgendaAppointment {
  id: string;
  date: string;
  startsAt: number;
  day: string;
  animal: string;
  venue?: 'home' | 'practice';
  source: 'calendly' | 'calendar';
  contact: GoogleContact | null;
  contacts: GoogleContact[];
  title?: string;
  calendar?: CalendarAppointment;
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENDA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function parisDay(date: Date | string | number = Date.now()): string {
  const parts = dayFormatter.formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function calendarDate(day: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new RangeError('Invalid calendar day');
  }
  const date = new Date(`${day}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || utcDay(date) !== day) {
    throw new RangeError('Invalid calendar day');
  }
  return date;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function appointmentTime(date: string): number | null {
  // Calendly returns instants with a zone. Never interpret a zone-less value
  // using the browser's local time, which would move bookings between days.
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(
      date
    )
  ) {
    return null;
  }
  try {
    calendarDate(date.slice(0, 10));
  } catch {
    return null;
  }
  const time = Date.parse(date);
  return Number.isFinite(time) ? time : null;
}

export function buildAgenda(
  contacts: readonly GoogleContact[],
  calendar: readonly CalendarAppointment[] = []
): {
  appointments: AgendaAppointment[];
  coverage: 'complete' | 'partial' | 'unavailable';
  contactsWithHistory: number;
  totalContacts: number;
} {
  const appointments = new Map<string, AgendaAppointment>();
  const canceled = new Set<string>();
  let contactsWithHistory = 0;

  for (const contact of contacts) {
    if (!Array.isArray(contact.history)) continue;
    contactsWithHistory += 1;
    for (const event of contact.history) {
      if (event.type !== 'appointment' || !event.id.trim()) continue;
      if (event.status === 'canceled') {
        canceled.add(event.id);
        continue;
      }
      if (event.status !== 'active') continue;
      const startsAt = appointmentTime(event.date);
      if (startsAt === null) continue;

      // The upstream ID is bookings.uri, the unique Calendly invitee URI.
      // Multiple contact matches refer to the same booking; distinct invitees
      // at the same time remain distinct appointments.
      const existing = appointments.get(event.id);
      if (existing) {
        if (!existing.contacts.some((item) => item.id === contact.id)) {
          existing.contacts.push(contact);
        }
        continue;
      }
      appointments.set(event.id, {
        id: event.id,
        date: event.date,
        startsAt,
        day: parisDay(startsAt),
        animal: event.animal.trim(),
        venue: 'practice',
        source: 'calendly',
        contact,
        contacts: [contact],
      });
    }
  }

  for (const id of canceled) appointments.delete(id);
  const normalizedEmail = (value: string) => value.trim().toLowerCase();
  for (const event of calendar) {
    const startsAt = appointmentTime(event.startsAt);
    if (startsAt === null || !['confirmed', 'tentative'].includes(event.status))
      continue;
    const emails = new Set((event.attendeeEmails ?? []).map(normalizedEmail));
    const owners = contacts.filter((contact) =>
      contact.emails.some((email) => emails.has(normalizedEmail(email)))
    );
    // A shared instant alone cannot link patients or collapse two bookings.
    const matches = [...appointments.values()].filter(
      (item) =>
        item.source === 'calendly' &&
        item.startsAt === startsAt &&
        item.contacts.some((owner) =>
          owners.some((contact) => contact.id === owner.id)
        )
    );
    if (
      matches.length === 1 &&
      (!matches[0]!.calendar || matches[0]!.calendar.id === event.id)
    ) {
      matches[0]!.calendar = event;
      continue;
    }
    appointments.set(`calendar:${event.id}`, {
      id: `calendar:${event.id}`,
      date: event.startsAt,
      startsAt,
      day: parisDay(startsAt),
      animal: '',
      title: event.title,
      // The calendar also contains cabinet visits. Only explicit wording can
      // classify an unmatched event; its source or patient's species cannot.
      venue: calendarVenue(event),
      source: 'calendar',
      contact: owners[0] ?? null,
      contacts: owners,
      calendar: event,
    });
  }

  return {
    appointments: [...appointments.values()]
      .filter((appointment) => !canceled.has(appointment.id))
      .sort((a, b) => a.startsAt - b.startsAt || a.id.localeCompare(b.id)),
    // A successfully loaded empty contact list has complete coverage. The
    // caller still checks appointmentsAvailable for an upstream outage.
    coverage:
      contactsWithHistory === contacts.length
        ? 'complete'
        : contactsWithHistory === 0
          ? 'unavailable'
          : 'partial',
    contactsWithHistory,
    totalContacts: contacts.length,
  };
}

function calendarVenue(event: CalendarAppointment): AgendaAppointment['venue'] {
  const text = `${event.title} ${event.location ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const home = /\bdomicile\b/.test(text);
  const practice = /\bcabinet\b/.test(text);
  return home === practice ? undefined : home ? 'home' : 'practice';
}

export function appointmentsForDay(
  appointments: readonly AgendaAppointment[],
  day: string
): AgendaAppointment[] {
  return appointments.filter((appointment) => appointment.day === day);
}

export function nextAppointment(
  appointments: readonly AgendaAppointment[],
  now = Date.now()
): AgendaAppointment | undefined {
  return appointments.find((appointment) => appointment.startsAt >= now);
}

export function shiftDay(day: string, offset: number): string {
  const date = calendarDate(day);
  date.setUTCDate(date.getUTCDate() + offset);
  return utcDay(date);
}

export function shiftMonth(day: string, offset: number): string {
  const date = calendarDate(day);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return utcDay(date);
}

export function monthDays(day: string): { day: string; inMonth: boolean }[] {
  const first = shiftMonth(day, 0);
  const mondayOffset = (calendarDate(first).getUTCDay() + 6) % 7;
  const start = shiftDay(first, -mondayOffset);
  // Six complete weeks keep the calendar's height stable between months.
  return Array.from({ length: 42 }, (_, index) => {
    const current = shiftDay(start, index);
    return { day: current, inMonth: current.slice(0, 7) === first.slice(0, 7) };
  });
}
