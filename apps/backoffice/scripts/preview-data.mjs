// Fictitious interface data only. Never imported by the deployed Worker.
export function createDemoData() {
  const names = [
    ['Camille', 'Rivière'],
    ['Élodie', 'Morel'],
    ['Julien', 'Laurent'],
    ['Manon', 'Dubois'],
    ['Alex', 'Perrin'],
    ['Louise', 'Bernard'],
    ['Noé', 'Petit'],
    ['Emma', 'Blanc'],
    ['Léa', 'Roux'],
    ['Hugo', 'Simon'],
    ['Zoé', 'Martin'],
    ['Léo', 'Faure'],
    ['Alice', 'Lefebvre'],
    ['Élodie', 'Fontaine'],
    ['Thomas', 'Garcia'],
    ['Sarah', 'Lemaire'],
    ['Lucas', 'Garnier'],
    ['Clara', 'Meyer'],
    ['Gabriel', 'Vincent'],
    ['Inès', 'Dumas'],
    ['Paul', 'André'],
    ['Chloé', 'Mercier'],
    ['Louis', 'Gauthier'],
    ['Anaïs', 'Boyer'],
    ['Raphaël', 'Robin'],
    ['Élodie', 'Deschamps'],
    ['Mathilde', 'Chevalier'],
    ['Antoine', 'François'],
    ['Lucie', 'Legrand'],
    ['Maxime', 'Bonnet'],
    ['Jeanne', 'Dupont'],
    ['Arthur', 'Leroy'],
    ['Julie', 'Girard'],
    ['Baptiste', 'Henry'],
    ['Margaux', 'Roussel'],
    ['Victor', 'Guerin'],
  ];
  const labels = [
    { id: 'contactGroups/calendly', name: 'Calendly' },
    { id: 'contactGroups/dogs', name: 'Chiens' },
    { id: 'contactGroups/horses', name: 'Chevaux' },
  ];
  const contacts = Array.from({ length: 36 }, (_, index) => {
    const [givenName, familyName] = names[index % names.length];
    const suffix =
      index >= names.length ? ` ${Math.floor(index / names.length) + 1}` : '';
    const contact = {
      id: `people/demo${index + 1}`,
      name: `${givenName} ${familyName}${suffix}`,
      givenName,
      familyName: familyName + suffix,
      etag: `demo-v1-${index}`,
      emails: index % 7 === 0 ? [] : [`contact.${index + 1}@example.test`],
      phones:
        index % 5 === 0
          ? []
          : [`00 00 00 00 ${String(index + 1).padStart(2, '0')}`],
      labelIds:
        index % 4 === 0
          ? []
          : [
              'contactGroups/calendly',
              index % 3 === 0 ? 'contactGroups/horses' : 'contactGroups/dogs',
            ],
      animals:
        index % 13 === 0
          ? []
          : [
              ['Moka', 'Nala', 'Oslo', 'Luna', 'Jazz', 'Plume'][index % 6],
              ...(index % 6 === 0 ? ['Poppy'] : []),
            ],
      lastAppointment:
        index % 13 === 0
          ? null
          : `2026-09-${String((index % 28) + 1).padStart(2, '0')}T10:00:00Z`,
    };
    contact.history = contact.lastAppointment
      ? [
          {
            id: `demo:appointment${index + 1}`,
            type: 'appointment',
            date: contact.lastAppointment,
            animal: contact.animals[0] ?? '',
            status: 'active',
          },
        ]
      : [];
    return contact;
  });
  return {
    contacts,
    labels,
    lists: [
      {
        id: 'demo-general',
        name: 'Actualités du cabinet',
        description: 'Les nouvelles et les conseils d’Agathe.',
      },
      {
        id: 'demo-dogs',
        name: 'Compagnons canins',
        description: 'Conseils et actualités pour les propriétaires de chiens.',
      },
      {
        id: 'demo-horses',
        name: 'Autour du cheval',
        description: 'Les prochaines nouvelles consacrées aux chevaux.',
      },
    ],
    memberships: contacts
      .filter((_, index) => index % 3 !== 0)
      .flatMap((contact, index) => [
        {
          listId: 'demo-general',
          contactId: contact.id,
          status: index % 2 ? 'confirmed' : 'pending',
        },
        ...(index % 4 === 0
          ? [{ listId: 'demo-dogs', contactId: contact.id, status: 'pending' }]
          : []),
      ]),
  };
}

// Self-contained factory also embedded in the offline HTML export.
export function createDemoTransport(initial) {
  const data = structuredClone(initial);
  data.archivedLists ??= [];
  let revision = 0;
  const demoId = () => `demo-${Date.now().toString(36)}-${++revision}`;
  const appointmentDate = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeZone: 'Europe/Paris',
  });
  return async (path, init = {}) => {
    if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = new URL(path, 'https://preview.invalid');
    const method = init.method ?? 'GET';
    const input = init.body ? JSON.parse(init.body) : null;
    if (method === 'GET') {
      if (url.pathname === '/api/next-appointment') {
        const fictitious =
          data.contacts.some((contact) =>
            contact.id.startsWith('people/demo')
          ) &&
          data.contacts.every((contact) =>
            contact.id.startsWith('people/demo')
          );
        const start = new Date(Date.now() + 86400000);
        start.setUTCHours(12, 0, 0, 0);
        return {
          state: fictitious ? 'ready' : 'not_connected',
          appointment: fictitious
            ? {
                id: 'demo-calendar-appointment',
                title: 'Consultation de Moka — Alice Lefebvre',
                startsAt: start.toISOString(),
                endsAt: new Date(start.getTime() + 3600000).toISOString(),
                location: 'Cabinet de Bordeaux (exemple fictif)',
                url: null,
                status: 'confirmed',
              }
            : null,
          checkedAt: fictitious ? new Date().toISOString() : null,
          demo: fictitious,
        };
      }
      if (url.pathname === '/api/consultation-reports') return { reports: [] };
      if (url.pathname === '/api/contact-summary') {
        const contact = data.contacts.find(
          (item) => item.id === url.searchParams.get('id')
        );
        if (!contact) throw new Error('contact_not_found');
        // Offline exports with real copied contacts must never invent a summary.
        const fictitious = contact.id.startsWith('people/demo');
        const appointment =
          fictitious && contact.history?.[0]
            ? {
                ...contact.history[0],
                kind: 'appointment',
                animalType: '',
                breed: '',
                birth: '',
                reason: 'Mobilité',
                oldInvitee: null,
                newInvitee: null,
              }
            : null;
        const sources = fictitious
          ? {
              id: contact.id,
              notes: [],
              appointments: appointment ? [appointment] : [],
              notesState: 'ready',
              observedAt: '2026-10-07T10:00:00Z',
              contextualAnimals: contact.animals,
            }
          : null;
        return {
          state: fictitious
            ? appointment
              ? 'ready'
              : 'insufficient'
            : 'unavailable',
          stale: false,
          summary: appointment
            ? {
                sentences: [
                  {
                    text: `Une réservation pour ${appointment.animal} est enregistrée le ${appointmentDate.format(new Date(appointment.date))}.`,
                    sourceIds: [appointment.id],
                  },
                  {
                    text: 'Le motif renseigné concerne la mobilité.',
                    sourceIds: [appointment.id],
                  },
                  {
                    text: 'Les informations disponibles ne précisent pas le résultat de la consultation.',
                    sourceIds: [appointment.id],
                  },
                ],
              }
            : null,
          sources,
          summarySources: sources,
          checkedAt: sources?.observedAt ?? null,
          generatedAt: appointment ? sources.observedAt : null,
          model: fictitious ? 'demo' : null,
          generationPaused: true,
        };
      }
      if (url.pathname === '/api/contacts') {
        const offset = Number(url.searchParams.get('pageToken') ?? 0);
        return structuredClone({
          contacts: data.contacts.slice(offset, offset + 20),
          nextPageToken:
            offset + 20 < data.contacts.length ? String(offset + 20) : null,
          appointmentsAvailable: data.appointmentsAvailable ?? true,
        });
      }
      if (url.pathname === '/api/contact-labels')
        return structuredClone({ labels: data.labels, nextPageToken: null });
      if (url.pathname === '/api/mailing-lists')
        return structuredClone({
          lists: data.lists,
          archivedLists: data.archivedLists,
          memberships: data.memberships.filter((membership) =>
            data.lists.some((list) => list.id === membership.listId)
          ),
        });
    }
    if (url.pathname === '/api/contact-summary/refresh' && method === 'POST')
      return { queued: true };
    if (url.pathname === '/api/contact' && method === 'PATCH') {
      const contact = data.contacts.find((item) => item.id === input.id);
      if (!contact) throw new Error('contact_not_found');
      if (contact.etag !== input.etag) throw new Error('contact_changed');
      Object.assign(contact, {
        givenName: input.givenName,
        familyName: input.familyName,
        name: [input.givenName, input.familyName].filter(Boolean).join(' '),
        emails: input.emails,
        phones: input.phones,
        etag: demoId(),
      });
      return { saved: true };
    }
    if (url.pathname === '/api/mailing-lists') {
      if (method === 'DELETE') {
        data.archivedLists.push(
          data.lists.find((list) => list.id === input.id)
        );
        data.lists = data.lists.filter((list) => list.id !== input.id);
      } else if (method === 'PATCH' && input.restore) {
        data.lists.push(
          data.archivedLists.find((list) => list.id === input.id)
        );
        data.archivedLists = data.archivedLists.filter(
          (list) => list.id !== input.id
        );
      } else {
        if (!input.name?.trim()) throw new Error('invalid_list');
        if (
          data.lists.some(
            (list) =>
              list.id !== input.id &&
              list.name.toLowerCase() === input.name.trim().toLowerCase()
          )
        )
          throw new Error('list_name_in_use');
        if (method === 'POST')
          data.lists.push({
            id: demoId(),
            name: input.name.trim(),
            description: input.description,
          });
        else
          Object.assign(
            data.lists.find((list) => list.id === input.id),
            { name: input.name.trim(), description: input.description }
          );
      }
      return { saved: true };
    }
    if (url.pathname === '/api/list-memberships') {
      if (method === 'PUT') {
        data.memberships = data.memberships.filter(
          (membership) => membership.contactId !== input.contactId
        );
        data.memberships.push(
          ...input.memberships.map((membership) => ({
            ...membership,
            contactId: input.contactId,
          }))
        );
      } else {
        for (const contactId of input.contactIds)
          for (const listId of input.listIds)
            if (
              !data.memberships.some(
                (membership) =>
                  membership.contactId === contactId &&
                  membership.listId === listId
              )
            )
              data.memberships.push({ contactId, listId, status: 'pending' });
      }
      return { saved: true };
    }
    throw new Error('not_found');
  };
}
