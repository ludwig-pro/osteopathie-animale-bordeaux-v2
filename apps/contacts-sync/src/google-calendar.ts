import { Clients } from './api.ts';
import { SyncError } from './errors.ts';
import type { Env, Fetcher } from './types.ts';

interface CalendarEvent {
  id: string;
  status?: string;
  eventType?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

function calendarLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 8192) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === 'calendar.google.com' ||
        (url.hostname === 'www.google.com' &&
          url.pathname.startsWith('/calendar/')))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function timestamp(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new SyncError('google_calendar_invalid_response', true);
  return Date.parse(value);
}

// Only called behind the account-checked private service entrypoint.
// No writes, persistence, attendees' coordinates or event descriptions.
export async function readNextAppointment(
  request: Request,
  env: Env,
  fetcher: Fetcher = fetch,
  now = Date.now()
): Promise<Response> {
  const reply = (value: unknown, status = 200) =>
    Response.json(value, {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  if (request.method !== 'GET') return reply({ error: 'read_only' }, 405);
  if (new URL(request.url).search)
    return reply({ error: 'invalid_calendar_request' }, 400);
  try {
    const calendar = env.GOOGLE_CALENDAR_ID ?? 'primary';
    if (!/^[A-Za-z0-9_.+@-]{1,1024}$/.test(calendar))
      throw new SyncError('google_configuration_missing');
    const api = new Clients(env, fetcher);
    const query = new URLSearchParams({
      timeMin: new Date(now).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      showDeleted: 'false',
      eventTypes: 'default',
      maxResults: '100',
      maxAttendees: '1',
      timeZone: 'Europe/Paris',
      fields:
        'kind,nextPageToken,items(id,status,eventType,summary,location,htmlLink,start,end,attendees(self,responseStatus))',
    });
    for (let page = 0; page < 3; page++) {
      const result = await api.googleCalendar<{
        kind?: string;
        items?: CalendarEvent[];
        nextPageToken?: string;
      }>(`/calendars/${encodeURIComponent(calendar)}/events?${query}`);
      if (
        !result ||
        result.kind !== 'calendar#events' ||
        (result.items !== undefined &&
          (!Array.isArray(result.items) || result.items.length > 100))
      )
        throw new SyncError('google_calendar_invalid_response', true);
      const appointments = [];
      for (const event of result.items ?? []) {
        if (!event || typeof event.id !== 'string' || !event.id)
          throw new SyncError('google_calendar_invalid_response', true);
        if (
          event.status === 'cancelled' ||
          (event.eventType && event.eventType !== 'default') ||
          event.attendees?.some(
            (attendee) =>
              attendee.self && attendee.responseStatus === 'declined'
          ) ||
          event.start?.date
        )
          continue;
        const start = timestamp(event.start?.dateTime);
        const end = timestamp(event.end?.dateTime);
        if (end <= start)
          throw new SyncError('google_calendar_invalid_response', true);
        // events.list timeMin filters by end time, so an ongoing event may appear.
        if (start < now) continue;
        if (
          (event.status &&
            !['confirmed', 'tentative'].includes(event.status)) ||
          (event.summary !== undefined &&
            (typeof event.summary !== 'string' ||
              event.summary.length > 4096)) ||
          (event.location !== undefined &&
            (typeof event.location !== 'string' ||
              event.location.length > 4096))
        )
          throw new SyncError('google_calendar_invalid_response', true);
        appointments.push({
          id: event.id,
          title: event.summary?.trim() || 'Rendez-vous',
          startsAt: new Date(start).toISOString(),
          endsAt: new Date(end).toISOString(),
          location: event.location?.trim() || null,
          url: calendarLink(event.htmlLink),
          status: event.status === 'tentative' ? 'tentative' : 'confirmed',
        });
      }
      const appointment = appointments.sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt)
      )[0];
      if (appointment || !result.nextPageToken)
        return reply({
          appointment: appointment ?? null,
          checkedAt: new Date(now).toISOString(),
        });
      if (
        typeof result.nextPageToken !== 'string' ||
        result.nextPageToken.length > 8192 ||
        /[\x00-\x1f\x7f]/.test(result.nextPageToken)
      )
        throw new SyncError('google_calendar_invalid_response', true);
      query.set('pageToken', result.nextPageToken);
    }
    // A bounded partial scan must never be presented as an empty calendar.
    throw new SyncError('google_calendar_scan_incomplete', true);
  } catch (error) {
    const code = error instanceof SyncError ? error.code : '';
    return reply(
      {
        error:
          code.includes('reauthorize') || code === 'google_calendar_http_403'
            ? 'google_calendar_authorization_required'
            : [
                  'google_configuration_missing',
                  'google_account_mismatch',
                ].includes(code)
              ? 'google_connection_unavailable'
              : 'google_calendar_unavailable',
      },
      503
    );
  }
}
