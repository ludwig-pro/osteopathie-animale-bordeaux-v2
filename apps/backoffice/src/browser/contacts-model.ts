import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ContactLabel,
  ContactPage,
  GoogleContact,
  LabelPage,
  ListMembership,
  MailingListsData,
} from '../contact-types';

export type ContactsTransport = (
  path: string,
  init?: RequestInit
) => Promise<unknown>;

export const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
export const contactName = (contact: GoogleContact) =>
  contact.name ||
  [contact.givenName, contact.familyName].filter(Boolean).join(' ') ||
  contact.emails[0] ||
  'Contact sans nom';
export const initials = (value: string) =>
  value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
export const appointmentDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : 'Non renseigné';

const messages: Record<string, string> = {
  google_connection_unavailable:
    'La connexion Google Contacts reste à configurer. Vos contacts apparaîtront ici après sa mise en service.',
  google_reconnection_required:
    'La connexion à Google doit être renouvelée avant de continuer.',
  google_rate_limited:
    'Google a temporairement limité les demandes. Réessayez dans quelques instants.',
  contact_changed:
    'Cette fiche a changé dans Google. Actualisez les contacts, puis rouvrez la fiche avant de l’enregistrer.',
  contact_not_found:
    'Cette fiche n’existe plus dans Google Contacts. Actualisez votre carnet d’adresses.',
  invalid_contact:
    'Vérifiez les coordonnées : un e-mail valide par ligne, des téléphones composés de chiffres, et au moins un nom ou une coordonnée.',
  list_name_in_use: 'Une liste porte déjà ce nom. Choisissez un autre nom.',
  list_not_found:
    'Cette liste a été modifiée ou archivée. Actualisez les listes.',
  invalid_list:
    'Renseignez un nom de 80 caractères maximum et une description de 500 caractères maximum.',
  lists_configuration_unavailable:
    'Le stockage des listes de diffusion reste à configurer.',
  session_expired:
    'Votre session a expiré. Rechargez la page pour vous reconnecter.',
};
export const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? (messages[error.message] ?? fallback) : fallback;

export async function readPages<T extends 'contacts' | 'labels'>(
  kind: T,
  transport: ContactsTransport,
  signal: AbortSignal
): Promise<{
  items: T extends 'contacts' ? GoogleContact[] : ContactLabel[];
  appointmentsAvailable: boolean;
}> {
  const items: (GoogleContact | ContactLabel)[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  let appointmentsAvailable = true;
  do {
    const path = kind === 'contacts' ? '/api/contacts' : '/api/contact-labels';
    const data = (await transport(
      `${path}${cursor ? `?pageToken=${encodeURIComponent(cursor)}` : ''}`,
      { signal }
    )) as ContactPage & LabelPage;
    items.push(...(kind === 'contacts' ? data.contacts : data.labels));
    if (kind === 'contacts')
      appointmentsAvailable &&= data.appointmentsAvailable;
    cursor = data.nextPageToken;
    if (cursor && seen.has(cursor)) throw new Error('pagination_failed');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return {
    items: items as T extends 'contacts' ? GoogleContact[] : ContactLabel[],
    appointmentsAvailable,
  };
}

export function useContacts(transport: ContactsTransport) {
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [labels, setLabels] = useState<ContactLabel[]>([]);
  const [lists, setLists] = useState<MailingListsData>({
    lists: [],
    memberships: [],
  });
  const [ready, setReady] = useState(false);
  const [listsReady, setListsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listsError, setListsError] = useState('');
  const [appointmentsAvailable, setAppointmentsAvailable] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const listsGeneration = useRef(0);

  const reloadLists = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++listsGeneration.current;
      try {
        const result = (await transport('/api/mailing-lists', {
          signal,
        })) as MailingListsData;
        if (signal?.aborted || current !== listsGeneration.current) return;
        setLists(result);
        setListsReady(true);
        setListsError('');
      } catch (failure) {
        if (!signal?.aborted && current === listsGeneration.current)
          setListsError(
            errorMessage(
              failure,
              'Impossible de charger les listes. Réessayez dans quelques instants.'
            )
          );
        throw failure;
      }
    },
    [transport]
  );

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true);
    setError('');
    const requests = await Promise.allSettled([
      readPages('contacts', transport, active.signal),
      readPages('labels', transport, active.signal),
      reloadLists(active.signal),
    ]);
    if (active.signal.aborted || current !== generation.current) return false;
    const [people, groups] = requests;
    if (people.status === 'fulfilled' && groups.status === 'fulfilled') {
      setContacts([
        ...new Map(
          people.value.items.map((contact) => [contact.id, contact])
        ).values(),
      ]);
      setLabels([
        ...new Map(
          groups.value.items.map((label) => [label.id, label])
        ).values(),
      ]);
      setAppointmentsAvailable(people.value.appointmentsAvailable);
      setReady(true);
      setUpdatedAt(new Date());
      setLoading(false);
      return true;
    }
    const failure =
      people.status === 'rejected'
        ? people.reason
        : groups.status === 'rejected'
          ? groups.reason
          : undefined;
    setError(
      errorMessage(
        failure,
        'Impossible de charger vos contacts. Réessayez dans quelques instants.'
      )
    );
    setLoading(false);
    return false;
  }, [transport, reloadLists]);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [refresh]);

  const mutation = useCallback(
    (path: string, method: string, input: unknown) =>
      transport(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    [transport]
  );

  const memberships = useMemo(() => {
    const result = new Map<string, ListMembership[]>();
    for (const item of lists.memberships)
      result.set(item.contactId, [...(result.get(item.contactId) ?? []), item]);
    return result;
  }, [lists]);

  return {
    contacts,
    labels,
    lists,
    ready,
    listsReady,
    loading,
    error,
    listsError,
    appointmentsAvailable,
    updatedAt,
    memberships,
    refresh,
    reloadLists,
    mutation,
  };
}

export type ContactsModel = ReturnType<typeof useContacts>;
