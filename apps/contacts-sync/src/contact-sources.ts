import { Clients } from './api.ts';
import { SyncError } from './errors.ts';
import { BEGIN, END } from './model.ts';
import type { Booking, Contact, Env, Fetcher, Person } from './types.ts';
import type { ContactNoteSource, ContactSources } from './source-types.ts';
import { bookingAnimalType } from './animal-type.ts';

/** Retain original text; only a verified managed block may be excluded. */
export function extractManualNotes(
  person: Person,
  tracked?: Pick<Contact, 'last_block' | 'pending_block'>
): { notes: ContactNoteSource[]; notesState: 'ready' | 'review' } {
  const biographies = person.biographies ?? [];
  const text = biographies.map((note) => note.value).join('\n\n');
  const original = text.trim()
    ? [{ id: 'google:original', kind: 'google-note' as const, text }]
    : [];
  const review = { notes: original, notesState: 'review' as const };
  if (
    biographies.length > 1 ||
    biographies.some(
      (note) => note.contentType && note.contentType !== 'TEXT_PLAIN'
    )
  )
    return review;
  const start = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (start < 0 && end < 0) {
    return tracked?.last_block || tracked?.pending_block
      ? review
      : { notes: original, notesState: 'ready' };
  }
  if (
    start < 0 ||
    end < start ||
    text.indexOf(BEGIN, start + BEGIN.length) >= 0 ||
    text.indexOf(END, end + END.length) >= 0
  )
    return review;
  const block = text.slice(start, end + END.length);
  if (block !== tracked?.last_block && block !== tracked?.pending_block)
    return review;
  return {
    notes: [
      {
        id: 'google:before',
        kind: 'google-note' as const,
        text: text.slice(0, start),
      },
      {
        id: 'google:after',
        kind: 'google-note' as const,
        text: text.slice(end + END.length),
      },
    ].filter((note) => note.text.trim()),
    notesState: 'ready',
  };
}

async function assembleSources(
  people: Person[],
  env: Env
): Promise<ContactSources[]> {
  if (
    people.some((person) => !/^people\/[\w-]+$/.test(person.resourceName ?? ''))
  )
    throw new SyncError('google_invalid_response');
  const ids = JSON.stringify(people.map((person) => person.resourceName));
  // Two queries per page; source unavailability fails the whole page, never an empty history.
  const tracked = await env.DB.prepare(
    'SELECT resource_name,last_block,pending_block FROM contacts WHERE resource_name IN (SELECT value FROM json_each(?))'
  )
    .bind(ids)
    .all<Contact>();
  const bookings = await env.DB.prepare(
    `SELECT c.resource_name,b.data FROM contacts c JOIN bookings b ON b.email=c.email
     WHERE c.resource_name IN (SELECT value FROM json_each(?)) ORDER BY b.uri`
  )
    .bind(ids)
    .all<{ resource_name: string; data: string }>();
  const byId = new Map(tracked.results.map((row) => [row.resource_name, row]));
  const histories = new Map<string, Booking[]>();
  for (const row of bookings.results) {
    const booking = JSON.parse(row.data) as Booking;
    if (
      !Number.isFinite(Date.parse(booking.start)) ||
      !['active', 'canceled'].includes(booking.status)
    )
      throw new SyncError('booking_sources_invalid');
    const history = histories.get(row.resource_name) ?? [];
    history.push(booking);
    histories.set(row.resource_name, history);
  }
  return people.map((person) => ({
    id: person.resourceName!,
    ...extractManualNotes(person, byId.get(person.resourceName!)),
    observedAt: new Date().toISOString(),
    appointments: (histories.get(person.resourceName!) ?? []).map(
      (booking) => ({
        id: booking.uri,
        kind: 'appointment',
        date: booking.start,
        animal: booking.animal,
        animalType: bookingAnimalType(booking) ?? '',
        breed: booking.breed,
        birth: booking.birth,
        reason: booking.reason,
        status: booking.status,
        oldInvitee: booking.oldInvitee,
        newInvitee: booking.newInvitee,
      })
    ),
  }));
}

export async function readContactSources(
  request: Request,
  env: Env,
  fetcher: Fetcher
): Promise<Response> {
  const url = new URL(request.url);
  const single = url.pathname === '/source';
  const key = single ? 'id' : 'pageToken';
  const value = url.searchParams.get(key);
  if (request.method !== 'GET')
    return Response.json({ error: 'read_only' }, { status: 405 });
  if (
    [...url.searchParams.keys()].some((name) => name !== key) ||
    url.searchParams.getAll(key).length > 1 ||
    (single
      ? !/^people\/[\w-]+$/.test(value ?? '')
      : value !== null &&
        (!value || value.length > 8192 || /[\x00-\x1f\x7f]/.test(value)))
  )
    return Response.json({ error: 'invalid_source_request' }, { status: 400 });
  try {
    const api = new Clients(env, fetcher);
    if (single) {
      const person = await api.person(value!);
      if (person.resourceName !== value)
        throw new SyncError('google_invalid_response');
      const [contact] = await assembleSources([person], env);
      return Response.json(
        { contact },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }
    const query = new URLSearchParams({
      pageSize: '100',
      personFields: 'biographies,metadata',
      sources: 'READ_SOURCE_TYPE_CONTACT',
    });
    if (value) query.set('pageToken', value);
    const page = await api.google<{
      connections?: Person[];
      nextPageToken?: string;
    }>(`/people/me/connections?${query}`);
    if (
      page.nextPageToken &&
      (page.nextPageToken === value || page.nextPageToken.length > 8192)
    )
      throw new SyncError('google_invalid_cursor');
    const contacts = await assembleSources(
      (page.connections ?? []).filter((person) => !person.metadata?.deleted),
      env
    );
    return Response.json(
      { contacts, nextPageToken: page.nextPageToken ?? null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    const deleted =
      error instanceof SyncError && error.code === 'google_contact_deleted';
    return Response.json(
      { error: deleted ? 'contact_not_found' : 'contact_sources_unavailable' },
      { status: deleted ? 404 : 503 }
    );
  }
}
