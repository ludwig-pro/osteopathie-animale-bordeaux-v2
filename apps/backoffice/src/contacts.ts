import { ALLOWED_EMAIL, type Env } from './config.ts';
import type { ContactPage, LabelPage } from './contact-types.ts';

export class ContactsError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const codes = new Set([
  'google_connection_unavailable',
  'google_reconnection_required',
  'google_rate_limited',
  'google_contacts_unavailable',
  'invalid_contact',
  'contact_changed',
  'contact_snapshot_changed',
  'contact_not_found',
  'google_contact_save_failed',
]);

export async function contactsPage(
  url: URL,
  env: Env
): Promise<ContactPage | LabelPage> {
  const cursor = url.searchParams.get('pageToken');
  if (
    [...url.searchParams.keys()].some((key) => key !== 'pageToken') ||
    url.searchParams.getAll('pageToken').length > 1 ||
    (cursor !== null &&
      (!cursor || cursor.length > 8192 || /[\x00-\x1f\x7f]/.test(cursor)))
  ) {
    throw new ContactsError(400, 'invalid_cursor');
  }
  if (!env.GOOGLE_CONTACTS)
    throw new ContactsError(503, 'google_connection_unavailable');
  const labels = url.pathname === '/api/contact-labels';
  const target = new URL(
    labels ? '/labels' : '/contacts',
    'https://contacts.internal'
  );
  if (cursor) target.searchParams.set('pageToken', cursor);
  try {
    const response = await env.GOOGLE_CONTACTS.fetch(
      new Request(target, {
        headers: { 'X-Contacts-Account': ALLOWED_EMAIL },
        signal: AbortSignal.timeout(25000),
      })
    );
    const data = (await response.json()) as ContactPage &
      LabelPage & { error?: string };
    if (!response.ok) {
      throw new ContactsError(
        503,
        codes.has(data.error ?? '')
          ? data.error!
          : 'google_contacts_unavailable'
      );
    }
    if (
      data.nextPageToken !== null &&
      (typeof data.nextPageToken !== 'string' ||
        !data.nextPageToken ||
        data.nextPageToken.length > 8192)
    ) {
      throw new Error('invalid_page');
    }
    if (labels) {
      if (
        !Array.isArray(data.labels) ||
        !data.labels.every(
          (label) =>
            typeof label?.id === 'string' &&
            /^contactGroups\/[\w-]+$/.test(label.id) &&
            typeof label.name === 'string'
        )
      )
        throw new Error('invalid_page');
      return {
        labels: data.labels.map(({ id, name }) => ({ id, name })),
        nextPageToken: data.nextPageToken,
      };
    }
    if (
      typeof data.appointmentsAvailable !== 'boolean' ||
      !Array.isArray(data.contacts) ||
      !data.contacts.every(
        (contact) =>
          typeof contact?.id === 'string' &&
          /^people\/[\w-]+$/.test(contact.id) &&
          typeof contact.name === 'string' &&
          typeof contact.givenName === 'string' &&
          typeof contact.familyName === 'string' &&
          typeof contact.etag === 'string' &&
          strings(contact.emails) &&
          strings(contact.phones) &&
          strings(contact.labelIds) &&
          strings(contact.animals) &&
          (contact.lastAppointment === null ||
            (typeof contact.lastAppointment === 'string' &&
              Number.isFinite(Date.parse(contact.lastAppointment))))
      )
    )
      throw new Error('invalid_page');
    return {
      contacts: data.contacts.map(
        ({
          id,
          name,
          givenName,
          familyName,
          etag,
          emails,
          phones,
          labelIds,
          animals,
          lastAppointment,
        }) => ({
          id,
          name,
          givenName,
          familyName,
          etag,
          emails,
          phones,
          labelIds,
          animals,
          lastAppointment,
        })
      ),
      nextPageToken: data.nextPageToken,
      appointmentsAvailable: data.appointmentsAvailable,
    };
  } catch (error) {
    if (error instanceof ContactsError) throw error;
    throw new ContactsError(503, 'google_contacts_unavailable');
  }
}

export async function saveContact(
  input: unknown,
  env: Env
): Promise<{ saved: true }> {
  if (!env.GOOGLE_CONTACTS)
    throw new ContactsError(503, 'google_connection_unavailable');
  try {
    const response = await env.GOOGLE_CONTACTS.fetch(
      new Request('https://contacts.internal/contact', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Contacts-Account': ALLOWED_EMAIL,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(30000),
      })
    );
    const data = (await response.json()) as { saved?: boolean; error?: string };
    if (!response.ok)
      throw new ContactsError(
        [400, 404, 409].includes(response.status) ? response.status : 503,
        codes.has(data.error ?? '') ? data.error! : 'google_contact_save_failed'
      );
    if (data.saved !== true) throw new Error('invalid_response');
    return { saved: true };
  } catch (error) {
    if (error instanceof ContactsError) throw error;
    throw new ContactsError(503, 'google_contact_save_failed');
  }
}
