import type { GoogleContact } from '../contact-types';

export const AGENDA_TIME_ZONE = 'Europe/Paris';

export interface AgendaAppointment {
  id: string;
  date: string;
  startsAt: number;
  day: string;
  animal: string;
  contact: GoogleContact;
  contacts: GoogleContact[];
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

export function buildAgenda(contacts: readonly GoogleContact[]): {
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
        contact,
        contacts: [contact],
      });
    }
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
