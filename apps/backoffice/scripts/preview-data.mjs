// Fictitious interface data only. Never imported by the deployed Worker.
export function createDemoData(now = new Date()) {
  const paris = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = (date) =>
    Object.fromEntries(
      paris.formatToParts(date).map(({ type, value }) => [type, Number(value)])
    );
  const today = parts(now);
  // Convert a Paris calendar date to UTC, including days across DST changes.
  const appointmentDate = (dayOffset, minutes) => {
    const wallTime = Date.UTC(
      today.year,
      today.month - 1,
      today.day + dayOffset,
      0,
      minutes
    );
    let instant = wallTime;
    for (let pass = 0; pass < 2; pass += 1) {
      const local = parts(new Date(instant));
      instant +=
        wallTime -
        Date.UTC(
          local.year,
          local.month - 1,
          local.day,
          local.hour,
          local.minute,
          local.second
        );
    }
    return new Date(instant).toISOString();
  };
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
              ['Moka', 'Nala', 'Oslo', 'Luna', 'Jazz', 'Plume'][index % 6] ??
                '',
              ...(index % 6 === 0 ? ['Poppy'] : []),
            ],
      animalTypes:
        index % 13 === 0 ? [] : [index % 3 === 0 ? 'Cheval' : 'Chien'],
      lastAppointment:
        index % 13 === 0 ? null : appointmentDate(-((index % 28) + 1), 10 * 60),
      history:
        /** @type {import('../src/contact-types.ts').ContactInteraction[]} */ ([]),
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
  const currentMinute = today.hour * 60 + today.minute;
  const nextMinute = Math.max(
    11 * 60,
    Math.ceil((currentMinute + 45) / 30) * 30
  );
  const appointments = [
    ...[nextMinute, nextMinute + 90].map((minute, index) => ({
      contact: index + 2,
      day: minute < 24 * 60 ? 0 : 1,
      minute: minute < 24 * 60 ? minute : 9 * 60 + index * 90,
    })),
    { contact: 4, day: 0, minute: 12 * 60, status: 'canceled' },
    { contact: 6, day: 1, minute: 9 * 60 + 30 },
    { contact: 7, day: 1, minute: 14 * 60 },
    { contact: 8, day: 3, minute: 11 * 60 },
    { contact: 9, day: 6, minute: 10 * 60 },
    { contact: 10, day: 9, minute: 15 * 60 },
    { contact: 11, day: 16, minute: 9 * 60 },
    { contact: 12, day: 35, minute: 11 * 60 },
  ];
  for (const [index, appointment] of appointments.entries()) {
    const contact = contacts[appointment.contact];
    // A late-night preview naturally places the next appointments tomorrow.
    const date = appointmentDate(appointment.day, appointment.minute);
    const status = appointment.status ?? 'active';
    contact.history.push({
      id: `${contact.id}/agenda-${index}`,
      type: 'appointment',
      date,
      animal: contact.animals[0] ?? '',
      status,
    });
    if (status === 'active' && Date.parse(date) <= now.getTime())
      contact.lastAppointment = date;
  }
  return {
    contacts,
    calendarAppointments:
      /** @type {import('../src/calendar-types.ts').CalendarAppointment[]} */ ([
        {
          id: 'demo-home-visit',
          title: contacts[1].animals[0],
          startsAt: appointmentDate(0, currentMinute >= 9 * 60 ? 9 * 60 : 0),
          endsAt: appointmentDate(0, currentMinute >= 9 * 60 ? 10 * 60 : 60),
          location: 'À domicile (adresse fictive)',
          url: null,
          status: 'confirmed',
          attendeeEmails: contacts[1].emails,
        },
        {
          id: 'demo-next-home-visit',
          title: contacts[12].animals[0],
          startsAt: appointmentDate(1, 12 * 60),
          endsAt: appointmentDate(1, 13 * 60),
          location: 'À domicile (adresse fictive)',
          url: null,
          status: 'confirmed',
          attendeeEmails: contacts[12].emails,
        },
        {
          id: 'demo-calendly-mirror',
          title: 'Consultation au cabinet',
          startsAt: contacts[2].history.at(-1).date,
          endsAt: new Date(
            Date.parse(contacts[2].history.at(-1).date) + 3600000
          ).toISOString(),
          location: null,
          url: null,
          status: 'confirmed',
          attendeeEmails: contacts[2].emails,
        },
      ]),
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
/**
 * @param {any} initial
 * @param {{ reports?: (import('../src/contact-types.ts').ConsultationReport & { contactId: string })[] }} [options]
 */
export function createDemoTransport(initial, { reports = [] } = {}) {
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
      if (url.pathname === '/api/calendar-appointments') {
        const fictitious =
          data.contacts.length > 0 &&
          data.contacts.every((contact) =>
            contact.id.startsWith('people/demo')
          );
        const from = url.searchParams.get('from') ?? '',
          to = url.searchParams.get('to') ?? '';
        return {
          state: fictitious ? 'ready' : 'not_connected',
          from,
          to,
          appointments: fictitious
            ? structuredClone(
                (data.calendarAppointments ?? []).filter(
                  (event) =>
                    event.startsAt >= `${from}T00:00:00` &&
                    event.startsAt < `${to}T00:00:00`
                )
              )
            : [],
          checkedAt: fictitious ? new Date().toISOString() : null,
          demo: fictitious,
        };
      }
      if (url.pathname === '/api/next-appointment') {
        const fictitious =
          data.contacts.some((contact) =>
            contact.id.startsWith('people/demo')
          ) &&
          data.contacts.every((contact) =>
            contact.id.startsWith('people/demo')
          );
        const next = (data.calendarAppointments ?? [])
          .filter((event) => Date.parse(event.startsAt) > Date.now())
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
        return {
          state: fictitious ? (next ? 'ready' : 'empty') : 'not_connected',
          appointment: fictitious ? structuredClone(next ?? null) : null,
          checkedAt: fictitious ? new Date().toISOString() : null,
          demo: fictitious,
        };
      }
      if (url.pathname === '/api/consultation-reports')
        return structuredClone({
          reports: reports
            .filter(
              (report) => report.contactId === url.searchParams.get('contactId')
            )
            .map(({ contactId, ...report }) => report),
        });
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
