import { CONTACTS_ACCOUNT_EMAIL, type Env } from './config.ts';
import { ContactsError } from './contacts.ts';
import type {
  CalendarAppointment,
  NextAppointmentView,
  CalendarAgendaView,
} from './calendar-types.ts';

function validLink(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || value.length > 8192) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === 'calendar.google.com' ||
        (url.hostname === 'www.google.com' &&
          url.pathname.startsWith('/calendar/')))
    );
  } catch {
    return false;
  }
}

function zonedTime(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    )
  )
    return NaN;
  const day = value.slice(0, 10);
  if (
    !Number.isFinite(Date.parse(day)) ||
    new Date(day).toISOString().slice(0, 10) !== day
  )
    return NaN;
  return Date.parse(value);
}

function validAppointment(value: CalendarAppointment): boolean {
  return Boolean(
    value &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 1024 &&
    typeof value.title === 'string' &&
    value.title.length > 0 &&
    value.title.length <= 4096 &&
    typeof value.startsAt === 'string' &&
    Number.isFinite(zonedTime(value.startsAt)) &&
    typeof value.endsAt === 'string' &&
    zonedTime(value.endsAt) > zonedTime(value.startsAt) &&
    (value.location === null ||
      (typeof value.location === 'string' && value.location.length <= 4096)) &&
    validLink(value.url) &&
    ['confirmed', 'tentative'].includes(value.status) &&
    (value.attendeeEmails === undefined ||
      (Array.isArray(value.attendeeEmails) &&
        value.attendeeEmails.length <= 250 &&
        value.attendeeEmails.every(
          (email) =>
            typeof email === 'string' &&
            email.length <= 320 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        )))
  );
}

export function calendarWindow(url: URL): { from: string; to: string } {
  const from = url.searchParams.get('from'),
    to = url.searchParams.get('to');
  if (
    [...url.searchParams.keys()].some((key) => !['from', 'to'].includes(key)) ||
    url.searchParams.getAll('from').length !== 1 ||
    url.searchParams.getAll('to').length !== 1 ||
    !from ||
    !to ||
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to)) ||
    new Date(from).toISOString().slice(0, 10) !== from ||
    new Date(to).toISOString().slice(0, 10) !== to ||
    Date.parse(to) <= Date.parse(from) ||
    Date.parse(to) - Date.parse(from) > 93 * 86400000
  )
    throw new ContactsError(400, 'invalid_calendar_request');
  return { from, to };
}

export async function calendarAgenda(
  env: Env,
  from: string,
  to: string
): Promise<CalendarAgendaView> {
  calendarWindow(
    new URL(`https://calendar.invalid/?${new URLSearchParams({ from, to })}`)
  );
  const absent: CalendarAgendaView = {
    state: 'not_connected',
    appointments: [],
    from,
    to,
    checkedAt: null,
    demo: false,
  };
  if (env.APP_ENVIRONMENT !== 'production') {
    if (!env.DB) return { ...absent, state: 'unavailable' };
    const row = await env.DB.prepare(
      `SELECT c.document,s.created_at FROM copied_calendar c
       JOIN preview_state p ON p.active_snapshot=c.snapshot_id
       JOIN contact_snapshots s ON s.id=c.snapshot_id WHERE p.id=1 AND s.data_version=1`
    ).first<{ document: string; created_at: string }>();
    if (!row) return { ...absent, state: 'unavailable' };
    if (!Number.isFinite(Date.parse(row.created_at)))
      throw new ContactsError(503, 'google_calendar_unavailable');
    let copied: NextAppointmentView;
    try {
      copied = JSON.parse(row.document) as NextAppointmentView;
    } catch {
      throw new ContactsError(503, 'google_calendar_unavailable');
    }
    if (!copied || typeof copied !== 'object')
      throw new ContactsError(503, 'google_calendar_unavailable');
    const agenda = copied.agenda;
    if (!agenda)
      return {
        ...absent,
        state:
          copied.state === 'not_connected' ? 'not_connected' : 'unavailable',
        copiedAt: row.created_at,
      };
    if (
      !['ready', 'not_connected', 'unavailable'].includes(agenda.state) ||
      agenda.demo !== false ||
      !Array.isArray(agenda.appointments) ||
      agenda.appointments.length > 1000 ||
      !agenda.appointments.every(validAppointment) ||
      (agenda.state === 'ready' &&
        !Number.isFinite(Date.parse(agenda.checkedAt ?? ''))) ||
      (agenda.state !== 'ready' && agenda.appointments.length !== 0) ||
      (agenda.checkedAt !== null &&
        !Number.isFinite(Date.parse(agenda.checkedAt)))
    )
      throw new ContactsError(503, 'google_calendar_unavailable');
    try {
      calendarWindow(
        new URL(
          `https://calendar.invalid/?${new URLSearchParams({ from: agenda.from, to: agenda.to })}`
        )
      );
    } catch {
      throw new ContactsError(503, 'google_calendar_unavailable');
    }
    if (agenda.from > from || agenda.to < to)
      return { ...absent, state: 'unavailable', copiedAt: row.created_at };
    return {
      state: agenda.state,
      checkedAt: agenda.checkedAt,
      demo: false,
      from,
      to,
      appointments: agenda.appointments
        .filter((event) => inWindow(event, from, to))
        .map(agendaAppointmentView),
      copiedAt: row.created_at,
    };
  }
  if (!env.GOOGLE_CONTACTS) return absent;
  try {
    const response = await env.GOOGLE_CONTACTS.fetch(
      new Request(
        `https://contacts.internal/calendar-appointments?${new URLSearchParams({ from, to })}`,
        {
          headers: { 'X-Contacts-Account': CONTACTS_ACCOUNT_EMAIL },
          signal: AbortSignal.timeout(45000),
        }
      )
    );
    const reader = response.body?.getReader();
    if (!reader) throw new Error('invalid_calendar_response');
    const decoder = new TextDecoder();
    let raw = '',
      bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024 * 1024) {
        await reader.cancel();
        throw new Error('invalid_calendar_response');
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const data = JSON.parse(raw) as CalendarAgendaView & { error?: string };
    if (!response.ok) {
      if (
        [
          'google_calendar_authorization_required',
          'google_connection_unavailable',
        ].includes(data.error ?? '')
      )
        return absent;
      throw new Error('calendar_unavailable');
    }
    if (
      data.from !== from ||
      data.to !== to ||
      !Number.isFinite(Date.parse(data.checkedAt ?? '')) ||
      !Array.isArray(data.appointments) ||
      data.appointments.length > 1000 ||
      !data.appointments.every(validAppointment)
    )
      throw new Error('invalid_calendar_response');
    return {
      state: 'ready',
      from,
      to,
      checkedAt: data.checkedAt,
      demo: false,
      appointments: data.appointments
        .filter((event) => inWindow(event, from, to))
        .map(agendaAppointmentView),
    };
  } catch {
    throw new ContactsError(503, 'google_calendar_unavailable');
  }
}

const appointmentView = (appointment: CalendarAppointment | null) =>
  appointment
    ? {
        id: appointment.id,
        title: appointment.title,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        location: appointment.location,
        url: appointment.url,
        status: appointment.status,
      }
    : null;

function agendaAppointmentView(
  appointment: CalendarAppointment
): CalendarAppointment {
  return {
    ...appointmentView(appointment)!,
    attendeeEmails: [
      ...new Set(
        (appointment.attendeeEmails ?? []).map((email) =>
          email.trim().toLowerCase()
        )
      ),
    ],
  };
}

function inWindow(
  appointment: CalendarAppointment,
  from: string,
  to: string
): boolean {
  const start = Date.parse(appointment.startsAt);
  return start >= Date.parse(from) && start < Date.parse(to);
}

export async function nextAppointment(env: Env): Promise<NextAppointmentView> {
  const notConnected: NextAppointmentView = {
    state: 'not_connected',
    appointment: null,
    checkedAt: null,
    demo: false,
  };
  // Non-production environments read only their own dated production copy.
  if (env.APP_ENVIRONMENT !== 'production') {
    if (!env.DB) return { ...notConnected, state: 'unavailable' };
    const row = await env.DB.prepare(
      `SELECT c.document,s.created_at FROM copied_calendar c
       JOIN preview_state p ON p.active_snapshot=c.snapshot_id
       JOIN contact_snapshots s ON s.id=c.snapshot_id WHERE p.id=1 AND s.data_version=1`
    ).first<{ document: string; created_at: string }>();
    if (!row) return { ...notConnected, state: 'unavailable' };
    const data = JSON.parse(row.document) as NextAppointmentView;
    if (
      !['ready', 'empty', 'not_connected'].includes(data.state) ||
      data.demo !== false ||
      !Number.isFinite(Date.parse(row.created_at)) ||
      (data.checkedAt === null
        ? data.state !== 'not_connected'
        : !Number.isFinite(Date.parse(data.checkedAt))) ||
      (data.appointment !== null && !validAppointment(data.appointment)) ||
      (data.state === 'ready') !== Boolean(data.appointment)
    )
      throw new ContactsError(503, 'google_calendar_unavailable');
    return {
      state: data.state,
      appointment: appointmentView(data.appointment),
      checkedAt: data.checkedAt,
      demo: false,
      copiedAt: row.created_at,
    };
  }
  if (!env.GOOGLE_CONTACTS) return notConnected;
  try {
    const response = await env.GOOGLE_CONTACTS.fetch(
      new Request('https://contacts.internal/next-appointment', {
        headers: { 'X-Contacts-Account': CONTACTS_ACCOUNT_EMAIL },
        signal: AbortSignal.timeout(45000),
      })
    );
    const reader = response.body?.getReader();
    if (!reader) throw new Error('invalid_calendar_response');
    const decoder = new TextDecoder();
    let raw = '';
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) {
        await reader.cancel();
        throw new Error('invalid_calendar_response');
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const data = JSON.parse(raw) as {
      appointment: CalendarAppointment | null;
      checkedAt: string;
      error?: string;
    };
    if (!response.ok) {
      if (
        [
          'google_calendar_authorization_required',
          'google_connection_unavailable',
        ].includes(data.error ?? '')
      )
        return notConnected;
      throw new Error('calendar_unavailable');
    }
    if (
      typeof data.checkedAt !== 'string' ||
      !Number.isFinite(Date.parse(data.checkedAt)) ||
      (data.appointment !== null && !validAppointment(data.appointment))
    )
      throw new Error('invalid_calendar_response');
    const appointment = data.appointment;
    return {
      state: appointment ? 'ready' : 'empty',
      appointment: appointmentView(appointment),
      checkedAt: data.checkedAt,
      demo: false,
    };
  } catch {
    throw new ContactsError(503, 'google_calendar_unavailable');
  }
}
