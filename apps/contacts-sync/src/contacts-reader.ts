import { bookingAnimalType } from './animal-type.ts';
import { Clients } from './api.ts';
import { SyncError } from './errors.ts';
import { normalizeEmail } from './model.ts';
import type { Env, Fetcher } from './types.ts';
import { editGoogleContact } from './contact-editor.ts';

const CONTACT_FIELDS = 'names,emailAddresses,phoneNumbers,memberships,metadata';
interface GoogleContact {
  resourceName?: string;
  etag?: string;
  metadata?: { deleted?: boolean };
  names?: {
    displayName?: string;
    givenName?: string;
    familyName?: string;
    metadata?: { primary?: boolean };
  }[];
  emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
  phoneNumbers?: { value?: string; metadata?: { primary?: boolean } }[];
  memberships?: {
    contactGroupMembership?: { contactGroupResourceName?: string };
  }[];
}

function values(
  fields: { value?: string; metadata?: { primary?: boolean } }[] = []
) {
  return [
    ...new Set(
      [...fields]
        .sort(
          (a, b) =>
            Number(Boolean(b.metadata?.primary)) -
            Number(Boolean(a.metadata?.primary))
        )
        .map((field) => field.value?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ];
}

function reply(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// Called only by the named Cloudflare service entrypoint, never the public fetch.
// Reads Google and the existing booking history without changing the sync mode.
export async function readGoogleContacts(
  request: Request,
  env: Env,
  fetcher: Fetcher = fetch
): Promise<Response> {
  const url = new URL(request.url);
  if (
    url.origin !== 'https://contacts.internal' ||
    !['/contacts', '/labels', '/contact'].includes(url.pathname)
  ) {
    return reply({ error: 'not_found' }, 404);
  }
  const expected = request.headers.get('X-Contacts-Account');
  if (
    !expected ||
    normalizeEmail(expected) !== normalizeEmail(env.EXPECTED_GOOGLE_EMAIL ?? '')
  ) {
    return reply({ error: 'google_connection_unavailable' }, 503);
  }
  if (url.pathname === '/contact') {
    return request.method === 'PATCH' && !url.search
      ? editGoogleContact(request, env, fetcher)
      : reply({ error: 'method_not_allowed' }, 405);
  }
  if (request.method !== 'GET') return reply({ error: 'read_only' }, 405);
  const cursor = url.searchParams.get('pageToken');
  if (
    [...url.searchParams.keys()].some((key) => key !== 'pageToken') ||
    url.searchParams.getAll('pageToken').length > 1 ||
    (cursor !== null &&
      (!cursor || cursor.length > 8192 || /[\x00-\x1f\x7f]/.test(cursor)))
  ) {
    return reply({ error: 'invalid_cursor' }, 400);
  }
  try {
    const api = new Clients(env, fetcher);
    const query = new URLSearchParams({ pageSize: '1000' });
    if (cursor) query.set('pageToken', cursor);
    if (url.pathname === '/labels') {
      query.set('groupFields', 'name,groupType,metadata');
      const page = await api.google<{
        contactGroups?: {
          resourceName?: string;
          name?: string;
          groupType?: string;
          metadata?: { deleted?: boolean };
        }[];
        nextPageToken?: string;
      }>(`/contactGroups?${query}`);
      return reply({
        labels: (page.contactGroups ?? [])
          .filter(
            (group) =>
              group.groupType === 'USER_CONTACT_GROUP' &&
              !group.metadata?.deleted &&
              /^contactGroups\/[\w-]+$/.test(group.resourceName ?? '') &&
              group.name
          )
          .map((group) => ({ id: group.resourceName, name: group.name })),
        nextPageToken: page.nextPageToken ?? null,
      });
    }
    query.set('personFields', CONTACT_FIELDS);
    query.set('sources', 'READ_SOURCE_TYPE_CONTACT');
    query.set('sortOrder', 'FIRST_NAME_ASCENDING');
    const page = await api.google<{
      connections?: GoogleContact[];
      nextPageToken?: string;
    }>(`/people/me/connections?${query}`);
    const contacts = (page.connections ?? [])
      .filter(
        (person) =>
          !person.metadata?.deleted &&
          /^people\/[\w-]+$/.test(person.resourceName ?? '')
      )
      .map((person) => ({
        id: person.resourceName,
        etag: person.etag ?? '',
        name: (
          person.names?.find((name) => name.metadata?.primary)?.displayName ??
          person.names?.[0]?.displayName ??
          ''
        ).trim(),
        givenName:
          (
            person.names?.find((name) => name.metadata?.primary) ??
            person.names?.[0]
          )?.givenName ?? '',
        familyName:
          (
            person.names?.find((name) => name.metadata?.primary) ??
            person.names?.[0]
          )?.familyName ?? '',
        emails: values(person.emailAddresses),
        phones: values(person.phoneNumbers),
        labelIds: [
          ...new Set(
            (person.memberships ?? [])
              .map(
                (item) => item.contactGroupMembership?.contactGroupResourceName
              )
              .filter((id): id is string =>
                /^contactGroups\/[\w-]+$/.test(id ?? '')
              )
          ),
        ],
        animals: [] as string[],
        animalTypes: [] as string[],
        lastAppointment: null as string | null,
        history: [] as
          | {
              id: string;
              type: 'appointment';
              date: string;
              animal: string;
              status: 'active' | 'canceled';
            }[]
          | undefined,
      }));
    let appointmentsAvailable = true;
    try {
      for (let offset = 0; offset < contacts.length; offset += 80) {
        const slice = contacts.slice(offset, offset + 80);
        const details = await env.DB.prepare(
          `SELECT c.resource_name AS id, COALESCE(json_extract(b.data, '$.animal'), '') AS animal,
          COALESCE(json_extract(b.data, '$.animalType'), '') AS animal_type,
          COALESCE(json_extract(b.data, '$.breed'), '') AS breed,
          json_group_array(json_object('id', b.uri, 'type', 'appointment', 'date', json_extract(b.data, '$.start'), 'animal', COALESCE(json_extract(b.data, '$.animal'), ''), 'status', json_extract(b.data, '$.status'))) AS history,
          MAX(CASE WHEN json_extract(b.data, '$.status') = 'active' AND datetime(json_extract(b.data, '$.start')) <= datetime(?) THEN json_extract(b.data, '$.start') END) AS last_appointment
          FROM contacts c JOIN bookings b ON b.email = c.email
          WHERE c.resource_name IN (${slice.map(() => '?').join(',')})
          GROUP BY c.resource_name, json_extract(b.data, '$.animal'), animal_type, breed`
        )
          .bind(new Date().toISOString(), ...slice.map((contact) => contact.id))
          .all<{
            id: string;
            animal: string;
            animal_type: string;
            breed: string;
            history: string;
            last_appointment: string | null;
          }>();
        const byId = new Map(slice.map((contact) => [contact.id, contact]));
        for (const row of details.results) {
          const contact = byId.get(row.id);
          if (!contact) continue;
          contact.history!.push(...JSON.parse(row.history));
          const animalType = bookingAnimalType({
            animalType: row.animal_type,
            breed: row.breed,
          });
          if (animalType && !contact.animalTypes.includes(animalType))
            contact.animalTypes.push(animalType);
          if (row.animal.trim() && !contact.animals.includes(row.animal))
            contact.animals.push(row.animal);
          if (
            row.last_appointment &&
            (!contact.lastAppointment ||
              row.last_appointment > contact.lastAppointment)
          )
            contact.lastAppointment = row.last_appointment;
        }
      }
    } catch {
      appointmentsAvailable = false;
      for (const contact of contacts) {
        contact.animals = [];
        contact.animalTypes = [];
        contact.lastAppointment = null;
        contact.history = undefined;
      }
    }
    return reply({
      contacts,
      nextPageToken: page.nextPageToken ?? null,
      appointmentsAvailable,
    });
  } catch (error) {
    const code = error instanceof SyncError ? error.code : '';
    const safeCode = code.includes('reauthorize')
      ? 'google_reconnection_required'
      : code.endsWith('_http_429')
        ? 'google_rate_limited'
        : ['google_configuration_missing', 'google_account_mismatch'].includes(
              code
            )
          ? 'google_connection_unavailable'
          : 'google_contacts_unavailable';
    return reply({ error: safeCode }, 503);
  }
}
