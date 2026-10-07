import { animalTypeFrom } from './animal-type.ts';
import { SyncError } from './errors.ts';
import type {
  Booking,
  Contact,
  Invitee,
  Person,
  ScheduledEvent,
} from './types.ts';

export const BEGIN = '--- Calendly (synchronisation) ---';
export const END = '--- Fin Calendly ---';
export const MARKER = 'calendly_sync_id';
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const questionKey = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’]/g, "'");
export function calendlyUri(value: unknown, kind: 'event' | 'invitee'): string {
  const path =
    kind === 'event'
      ? '/scheduled_events/[A-Za-z0-9-]+'
      : '/scheduled_events/[A-Za-z0-9-]+/invitees/[A-Za-z0-9-]+';
  if (
    typeof value !== 'string' ||
    !new RegExp(`^https://api\\.calendly\\.com${path}$`).test(value)
  )
    throw new SyncError('invalid_calendly_uri');
  return value;
}
export function bookingFrom(invitee: Invitee, event: ScheduledEvent): Booking {
  calendlyUri(invitee.uri, 'invitee');
  calendlyUri(event.uri, 'event');
  if (
    invitee.event !== event.uri ||
    !invitee.uri.startsWith(`${event.uri}/invitees/`)
  )
    throw new SyncError('invitee_event_mismatch');
  if (
    typeof invitee.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitee.email.trim())
  )
    throw new SyncError('missing_or_invalid_email');
  if (!Number.isFinite(Date.parse(event.start_time)))
    throw new SyncError('invalid_event_date');
  const questions = new Map(
    (invitee.questions_and_answers ?? []).map((q) => [
      questionKey(q.question),
      q.answer,
    ])
  );
  const speciesAnswer =
    questions.get("espece de l'animal") ??
    questions.get("type d'animal") ??
    questions.get("type de l'animal");
  const animalType = animalTypeFrom(speciesAnswer ?? event.name);
  return {
    ...(animalType ? { animalType } : {}),
    uri: invitee.uri,
    eventUri: event.uri,
    email: normalizeEmail(invitee.email),
    name: invitee.name?.trim() ?? '',
    phone: questions.get('numero de telephone')?.trim() ?? '',
    start: event.start_time,
    status:
      invitee.status === 'canceled' || event.status === 'canceled'
        ? 'canceled'
        : 'active',
    animal: questions.get("prenom de l'animal") ?? '',
    breed: questions.get("race de l'animal") ?? '',
    birth: questions.get("date de naissance de l'animal") ?? '',
    reason: questions.get('motif de consultation') ?? '',
    oldInvitee: invitee.old_invitee ?? null,
    newInvitee: invitee.new_invitee ?? null,
    updatedAt:
      [invitee.updated_at, event.updated_at].filter(Boolean).sort().at(-1) ??
      event.start_time,
  };
}
// French numbers are normalized when unambiguous; otherwise retain the supplied text.
export function phoneKey(value: string): string {
  let clean = value.replace(/[^\d+]/g, '');
  if (/^0[1-9]\d{8}$/.test(clean)) clean = '+33' + clean.slice(1);
  if (clean.startsWith('00')) clean = '+' + clean.slice(2);
  return clean || value.trim();
}
function safeText(value: string) {
  return value
    .replaceAll(BEGIN, '[Calendly]')
    .replaceAll(END, '[Fin Calendly]')
    .replace(/\r/g, '');
}
export function renderBlock(bookings: Booking[]): string {
  const lines = bookings
    .toSorted(
      (a, b) => a.start.localeCompare(b.start) || a.uri.localeCompare(b.uri)
    )
    .map((b) =>
      [
        `${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(b.start))} — ${b.status === 'canceled' ? 'Annulé' : 'Confirmé'}`,
        b.animal && `Animal : ${safeText(b.animal)}`,
        b.breed && `Race : ${safeText(b.breed)}`,
        b.birth && `Naissance : ${safeText(b.birth)}`,
        b.reason && `Motif : ${safeText(b.reason)}`,
        b.oldInvitee && 'Report d’un rendez-vous précédent.',
        b.newInvitee && 'Remplacé par un nouveau rendez-vous.',
        `Référence : ${b.uri.split('/').at(-1)}`,
      ]
        .filter(Boolean)
        .join('\n')
    );
  return `${BEGIN}\n${lines.join('\n\n')}\n${END}`;
}
export function mergeNotes(
  notes: string,
  block: string,
  contact: Pick<Contact, 'last_block' | 'pending_block'>
): string {
  const start = notes.indexOf(BEGIN),
    end = notes.indexOf(END);
  let merged: string;
  if (start < 0 && end < 0) {
    if (contact.last_block || contact.pending_block)
      throw new SyncError('notes_manually_modified');
    merged = notes + (notes ? '\n\n' : '') + block;
  } else {
    if (
      start < 0 ||
      end < start ||
      notes.indexOf(BEGIN, start + BEGIN.length) >= 0 ||
      notes.indexOf(END, end + END.length) >= 0
    )
      throw new SyncError('notes_manually_modified');
    const existing = notes.slice(start, end + END.length);
    if (existing !== contact.last_block && existing !== contact.pending_block)
      throw new SyncError('notes_manually_modified');
    merged = notes.slice(0, start) + block + notes.slice(end + END.length);
  }
  if (new TextEncoder().encode(merged).length > 16000)
    throw new SyncError('notes_too_large');
  return merged;
}
export function mergePerson(
  person: Person,
  contact: Contact,
  bookings: Booking[],
  group: string
): { person: Person; fields: string[]; block: string } {
  const block = renderBlock(bookings);
  const notes = person.biographies?.[0]?.value ?? '';
  if (
    person.biographies?.some(
      (b) => b.contentType && b.contentType !== 'TEXT_PLAIN'
    )
  )
    throw new SyncError('notes_format_unsupported');
  const next: Person = { ...person };
  const fields: string[] = [];
  const newest = bookings.toSorted((a, b) => b.start.localeCompare(a.start));
  if (
    !person.names?.some(
      (n) => n.givenName || n.familyName || n.displayName || n.unstructuredName
    )
  ) {
    const name = newest.find((b) => b.name)?.name;
    if (name) {
      next.names = [{ unstructuredName: name }];
      fields.push('names');
    }
  }
  if (
    !person.emailAddresses?.some(
      (e) => normalizeEmail(e.value) === contact.email
    )
  ) {
    next.emailAddresses = [
      ...(person.emailAddresses ?? []),
      { value: contact.email },
    ];
    fields.push('emailAddresses');
  }
  const phones = [...(person.phoneNumbers ?? [])];
  for (const b of newest)
    if (
      b.phone &&
      !phones.some(
        (p) => phoneKey(p.canonicalForm ?? p.value) === phoneKey(b.phone)
      )
    )
      phones.push({ value: phoneKey(b.phone) });
  if (phones.length !== (person.phoneNumbers?.length ?? 0)) {
    next.phoneNumbers = phones;
    fields.push('phoneNumbers');
  }
  const merged = mergeNotes(notes, block, contact);
  if (merged !== notes) {
    next.biographies = [{ value: merged, contentType: 'TEXT_PLAIN' }];
    fields.push('biographies');
  }
  if (
    !person.memberships?.some(
      (m) => m.contactGroupMembership?.contactGroupResourceName === group
    )
  ) {
    next.memberships = [
      ...(person.memberships ?? []),
      { contactGroupMembership: { contactGroupResourceName: group } },
    ];
    fields.push('memberships');
  }
  const marker = person.userDefined?.find((p) => p.key === MARKER);
  if (marker && marker.value !== contact.marker)
    throw new SyncError('contact_marker_conflict');
  if (!marker) {
    next.userDefined = [
      ...(person.userDefined ?? []),
      { key: MARKER, value: contact.marker },
    ];
    fields.push('userDefined');
  }
  return { person: next, fields, block };
}
