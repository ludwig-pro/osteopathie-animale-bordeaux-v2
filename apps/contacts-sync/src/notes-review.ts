import { BEGIN, END, MARKER } from './model.ts';
import type { Contact, Person } from './types.ts';

export type NotesAction = 'inspect' | 'recover-unconfirmed';

export function notesReview(person: Person, contact: Contact) {
  const notes = person.biographies?.[0]?.value ?? '';
  const start = notes.indexOf(BEGIN),
    end = notes.indexOf(END);
  const block =
    start >= 0 && end >= start ? notes.slice(start, end + END.length) : null;
  const marker = person.userDefined?.find((p) => p.key === MARKER);
  const formatSupported = !person.biographies?.some(
    (b) => b.contentType && b.contentType !== 'TEXT_PLAIN'
  );
  return {
    observed_at: Date.now(),
    notes_bytes: new TextEncoder().encode(notes).length,
    has_begin: start >= 0,
    has_end: end >= 0,
    has_confirmed_block: Boolean(contact.last_block),
    has_pending_block: Boolean(contact.pending_block),
    matches_confirmed: block !== null && block === contact.last_block,
    matches_pending: block !== null && block === contact.pending_block,
    has_google_marker: Boolean(marker),
    marker_matches: marker?.value === contact.marker,
    previously_synced: contact.synced_at !== null,
    format_supported: formatSupported,
    // Only an explicitly authorized first-write recovery may disregard an old
    // intent. All current Google notes remain intact and the contact stays mapped.
    can_recover_unconfirmed:
      Boolean(contact.resource_name && contact.pending_block) &&
      !contact.last_block &&
      contact.synced_at === null &&
      start < 0 &&
      end < 0 &&
      !marker &&
      formatSupported,
  };
}
