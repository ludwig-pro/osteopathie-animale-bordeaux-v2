import { CONTACTS_ACCOUNT_EMAIL, type Env } from './config.ts';
import { ContactsError } from './contacts.ts';
import type {
  CalendarAppointment,
  NextAppointmentView,
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
    Number.isFinite(Date.parse(value.startsAt)) &&
    typeof value.endsAt === 'string' &&
    Date.parse(value.endsAt) > Date.parse(value.startsAt) &&
    (value.location === null ||
      (typeof value.location === 'string' && value.location.length <= 4096)) &&
    validLink(value.url) &&
    ['confirmed', 'tentative'].includes(value.status)
  );
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
