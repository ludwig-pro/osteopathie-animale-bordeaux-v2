import { Clients } from './api.ts';
import { SyncError } from './errors.ts';
import type { Env, Fetcher, Person } from './types.ts';

export async function editGoogleContact(
  request: Request,
  env: Env,
  fetcher: Fetcher
): Promise<Response> {
  const reply = (data: unknown, status = 200) =>
    Response.json(data, {
      status,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  let input: {
    id: string;
    etag: string;
    givenName: string;
    familyName: string;
    emails: string[];
    phones: string[];
  };
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > 65536)
      return reply({ error: 'invalid_contact' }, 400);
    input = JSON.parse(new TextDecoder().decode(bytes));
    const validText = (value: unknown, max: number): value is string =>
      typeof value === 'string' &&
      value.length <= max &&
      !/[\x00-\x1f\x7f]/.test(value);
    if (
      !input ||
      !/^people\/[\w-]+$/.test(input.id) ||
      !validText(input.etag, 2048) ||
      !input.etag ||
      !validText(input.givenName, 200) ||
      !validText(input.familyName, 200) ||
      !Array.isArray(input.emails) ||
      input.emails.length > 20 ||
      !input.emails.every(
        (email) =>
          validText(email, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) ||
      !Array.isArray(input.phones) ||
      input.phones.length > 20 ||
      !input.phones.every(
        (phone) =>
          validText(phone, 64) &&
          /^[+\d().\s-]+$/.test(phone) &&
          /\d/.test(phone)
      ) ||
      !(
        input.givenName.trim() ||
        input.familyName.trim() ||
        input.emails.length ||
        input.phones.length
      )
    )
      return reply({ error: 'invalid_contact' }, 400);
  } catch {
    return reply({ error: 'invalid_contact' }, 400);
  }
  try {
    const api = new Clients(env, fetcher);
    const person = await api.google<Person>(
      `/${input.id}?personFields=names,emailAddresses,phoneNumbers,metadata&sources=READ_SOURCE_TYPE_CONTACT`
    );
    if (person.etag !== input.etag)
      return reply({ error: 'contact_changed' }, 409);
    const sources = person.metadata?.sources?.filter(
      (source) => source.type === 'CONTACT'
    );
    if (!sources?.length || sources.some((source) => !source.etag))
      return reply({ error: 'contact_changed' }, 409);
    const emails = [
      ...new Map(
        input.emails.map((email) => [email.trim().toLowerCase(), email.trim()])
      ).values(),
    ];
    const phones = [...new Set(input.phones.map((phone) => phone.trim()))];
    const existingName = person.names?.[0] ?? {};
    const preservedName = Object.fromEntries(
      Object.entries(existingName).filter(
        ([key]) =>
          ![
            'displayName',
            'displayNameLastFirst',
            'metadata',
            'unstructuredName',
          ].includes(key)
      )
    );
    await api.google(
      `/${input.id}:updateContact?updatePersonFields=names,emailAddresses,phoneNumbers&personFields=metadata`,
      'PATCH',
      {
        resourceName: input.id,
        etag: person.etag,
        metadata: { sources },
        names:
          input.givenName.trim() || input.familyName.trim()
            ? [
                {
                  ...preservedName,
                  givenName: input.givenName.trim(),
                  familyName: input.familyName.trim(),
                },
              ]
            : [],
        emailAddresses: emails.map((value) => ({
          ...person.emailAddresses?.find(
            (email) => email.value.toLowerCase() === value.toLowerCase()
          ),
          value,
        })),
        phoneNumbers: phones.map((value) => ({
          ...person.phoneNumbers?.find(
            (phone) =>
              phone.value.replace(/\D/g, '') === value.replace(/\D/g, '')
          ),
          value,
        })),
      }
    );
    return reply({ saved: true });
  } catch (error) {
    const code = error instanceof SyncError ? error.code : '';
    const safeCode =
      code === 'google_http_404'
        ? 'contact_not_found'
        : code === 'google_update_http_400'
          ? 'contact_changed'
          : code.includes('reauthorize')
            ? 'google_reconnection_required'
            : 'google_contact_save_failed';
    return reply(
      { error: safeCode },
      safeCode === 'contact_not_found'
        ? 404
        : safeCode === 'contact_changed'
          ? 409
          : 503
    );
  }
}
