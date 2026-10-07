import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import type { GoogleContact } from '../contact-types';
import {
  appointmentDate,
  contactName,
  normalize,
  type ContactsModel,
} from './contacts-model';
import { EmptyState, Notice } from './common';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from './ui/dropdown';
import { Heading } from './ui/heading';
import { Input, InputGroup } from './ui/input';
import { Pagination } from './ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Text } from './ui/text';
import {
  contactColumns,
  columnWidthsStorageKey,
  parseColumnWidths,
  type ContactColumn,
} from './contact-column-widths';
import { ResizableColumnHeader } from './resizable-column-header';
import { formatPhoneNumber } from './phone-number';

export function ContactsPage({
  source = 'google',
  onCopy,
  model,
  listFilter,
  onListFilter,
  onContact,
  onBulk,
  notice,
}: {
  model: ContactsModel;
  source?: 'google' | 'demo' | 'copy';
  onCopy?: () => void;
  listFilter: string;
  onListFilter: (value: string) => void;
  onContact: (contact: GoogleContact) => void;
  onBulk: (ids: string[], done: () => void) => void;
  notice: string;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{
    column: ContactColumn['id'];
    direction: 'asc' | 'desc';
  }>({ column: 'name', direction: 'asc' });
  const sortColumn = (column: ContactColumn['id']) =>
    setSort((current) => ({
      column,
      direction:
        current.column === column && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      return parseColumnWidths(
        window.localStorage.getItem(columnWidthsStorageKey)
      );
    } catch {
      return parseColumnWidths(null);
    }
  });
  const widthsRef = useRef(columnWidths);
  function resizeColumn(column: ContactColumn, width: number) {
    widthsRef.current = { ...widthsRef.current, [column.id]: width };
    setColumnWidths(widthsRef.current);
  }
  function saveColumnWidths() {
    try {
      window.localStorage.setItem(
        columnWidthsStorageKey,
        JSON.stringify(widthsRef.current)
      );
    } catch {
      // Resizing remains usable when browser storage is disabled.
    }
  }
  const pageSize = 25;
  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    const collator = new Intl.Collator('fr', {
      numeric: true,
      sensitivity: 'base',
    });
    return model.contacts
      .filter((contact) => {
        if (
          query &&
          !normalize(
            [
              contactName(contact),
              contact.identity?.originalName ?? '',
              ...contact.emails,
              ...contact.phones,
              ...contact.phones.map(formatPhoneNumber),
              ...contact.animals,
            ].join(' ')
          ).includes(query)
        )
          return false;
        const memberships = model.memberships.get(contact.id) ?? [];
        if (listFilter === '__unassigned' && memberships.length) return false;
        if (
          listFilter &&
          listFilter !== '__unassigned' &&
          !memberships.some((membership) => membership.listId === listFilter)
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const value = (contact: GoogleContact) => {
          switch (sort.column) {
            case 'name':
              return contactName(contact);
            case 'phone':
              return contact.phones[0] ?? '';
            case 'animals':
              return contact.animals.join(', ');
            case 'animalTypes':
              return (contact.animalTypes ?? []).join(', ');
            case 'appointment':
              return contact.lastAppointment ?? '';
            case 'lists':
              return (model.memberships.get(contact.id) ?? [])
                .map(
                  (m) =>
                    model.lists.lists.find((l) => l.id === m.listId)?.name ?? ''
                )
                .join(', ');
          }
        };
        const left = value(a),
          right = value(b);
        if (!left !== !right) return left ? -1 : 1;
        return (
          (sort.direction === 'desc' ? -1 : 1) *
            collator.compare(left, right) ||
          collator.compare(contactName(a), contactName(b))
        );
      });
  }, [
    model.contacts,
    model.lists.lists,
    model.memberships,
    search,
    listFilter,
    sort,
  ]);
  useEffect(() => {
    setPage(0);
  }, [search, listFilter, sort]);
  useEffect(() => {
    const ids = new Set(model.contacts.map((contact) => contact.id));
    setSelected(
      (previous) => new Set([...previous].filter((id) => ids.has(id)))
    );
  }, [model.contacts]);
  const currentPage = Math.max(
    0,
    Math.min(page, Math.ceil(filtered.length / pageSize) - 1)
  );
  const visible = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );
  const selectedOnPage = visible.filter((contact) =>
    selected.has(contact.id)
  ).length;
  const hasFilters = Boolean(search || listFilter);
  const reset = () => {
    setSearch('');
    onListFilter('');
  };
  const toggle = (id: string, checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  const listBadges = (contact: GoogleContact) => {
    const memberships = model.memberships.get(contact.id) ?? [];
    return (
      <div className="flex max-w-56 flex-wrap gap-1.5">
        {memberships.slice(0, 2).map((membership) => {
          const list = model.lists.lists.find(
            (item) => item.id === membership.listId
          );
          return list ? (
            <Badge
              key={membership.listId}
              color={membership.status === 'unsubscribed' ? 'zinc' : 'green'}
              title={
                membership.status === 'unsubscribed'
                  ? 'Désinscrit'
                  : membership.status === 'confirmed'
                    ? 'Accord confirmé'
                    : 'Accord à confirmer'
              }
            >
              {list.name}
            </Badge>
          ) : null;
        })}
        {memberships.length > 2 && (
          <Badge color="zinc">+{memberships.length - 2}</Badge>
        )}
        {!memberships.length && (
          <span className="text-zinc-500">
            {model.listsReady ? '—' : 'Indisponible'}
          </span>
        )}
      </div>
    );
  };
  return (
    <div aria-busy={model.loading}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Heading>Contacts</Heading>
        <div className="flex flex-wrap items-center gap-2">
          {onCopy && (
            <Button outline onClick={onCopy}>
              Copier en preview
            </Button>
          )}

          <Button
            outline
            id="contacts-refresh"
            disabled={model.loading}
            onClick={() => {
              void model.refresh();
            }}
          >
            <ArrowPathIcon className={model.loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualiser</span>
            <span className="sr-only sm:hidden">Actualiser les contacts</span>
          </Button>
        </div>
      </div>
      {(model.error || model.listsError || notice) && (
        <div className="mt-5 space-y-3">
          {model.error && <Notice>{model.error}</Notice>}
          {model.listsError && <Notice>{model.listsError}</Notice>}
          {notice && <Notice success>{notice}</Notice>}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <InputGroup className="min-w-0 flex-1 basis-64">
          <MagnifyingGlassIcon />
          <Input
            id="contacts-search"
            aria-label="Rechercher un contact"
            type="search"
            placeholder="Rechercher un nom, un e-mail, un animal…"
            maxLength={200}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={!model.ready}
          />
        </InputGroup>
      </div>
      <div className="my-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Text id="contacts-results" role="status">
            {model.ready
              ? `${filtered.length} contact${filtered.length > 1 ? 's' : ''}${hasFilters ? ` sur ${model.contacts.length}` : ''}`
              : model.loading
                ? 'Chargement du carnet d’adresses…'
                : 'Contacts non chargés'}
          </Text>
          {hasFilters && (
            <Button plain onClick={reset} id="contacts-reset">
              Réinitialiser la recherche
            </Button>
          )}
        </div>
      </div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5">
          <span
            id="contacts-selected-count"
            className="mr-2 text-sm font-medium text-green-800"
          >
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <Button
            plain
            onClick={() =>
              setSelected(
                new Set([...selected, ...filtered.map((contact) => contact.id)])
              )
            }
          >
            Sélectionner les {filtered.length} résultats
          </Button>
          <Button
            className="sm:ml-auto"
            disabled={!model.listsReady || !model.lists.lists.length}
            onClick={() => onBulk([...selected], () => setSelected(new Set()))}
            id="contacts-assign"
          >
            <TagIcon />
            Ajouter à des listes
          </Button>
          <Button
            plain
            aria-label="Annuler la sélection"
            onClick={() => setSelected(new Set())}
          >
            <XMarkIcon />
          </Button>
        </div>
      )}
      {!model.ready ? (
        <EmptyState
          title={
            model.loading
              ? 'Chargement de vos contacts'
              : 'Carnet d’adresses indisponible'
          }
          description={
            model.loading
              ? 'Lecture des fiches et de leurs libellés Google.'
              : 'Vérifiez la connexion Google, puis réessayez.'
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          title={
            model.contacts.length
              ? 'Aucun contact ne correspond.'
              : 'Votre carnet d’adresses est vide.'
          }
          description={
            model.contacts.length
              ? 'Essayez une autre recherche ou effacez les filtres.'
              : source === 'copy'
                ? 'Depuis la production, utilisez « Copier en preview », puis actualisez cette page.'
                : 'Les fiches ajoutées dans Google Contacts apparaîtront ici après actualisation.'
          }
          action={hasFilters ? 'Réinitialiser la recherche' : undefined}
          onAction={reset}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table
              dense
              className="contacts-table [&_table]:w-(--contacts-table-width) [&_table]:min-w-0 [&_table]:table-fixed [&_tbody_td]:overflow-hidden [&_tbody_td]:text-ellipsis"
              style={
                {
                  '--contacts-table-width': `${88 + Object.values(columnWidths).reduce((sum, width) => sum + width, 0)}px`,
                } as CSSProperties
              }
            >
              <colgroup>
                <col style={{ width: 44 }} />
                {contactColumns.map((column) => (
                  <col
                    key={column.id}
                    style={{ width: columnWidths[column.id] }}
                  />
                ))}
                <col style={{ width: 44 }} />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableHeader className="w-8">
                    <Checkbox
                      color="green"
                      id="contacts-select-page"
                      aria-label="Sélectionner cette page"
                      checked={selectedOnPage === visible.length}
                      indeterminate={
                        selectedOnPage > 0 && selectedOnPage < visible.length
                      }
                      onChange={(checked) =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          for (const contact of visible)
                            checked
                              ? next.add(contact.id)
                              : next.delete(contact.id);
                          return next;
                        })
                      }
                    />
                  </TableHeader>
                  {contactColumns.map((column) => (
                    <ResizableColumnHeader
                      key={column.id}
                      column={column}
                      sortDirection={
                        sort.column === column.id ? sort.direction : undefined
                      }
                      onSort={() => sortColumn(column.id)}
                      width={columnWidths[column.id]}
                      onResize={resizeColumn}
                      onCommit={saveColumnWidths}
                    />
                  ))}
                  <TableHeader>
                    <span className="sr-only">Actions</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((contact) => (
                  <TableRow key={contact.id} className="hover:bg-zinc-50">
                    <TableCell>
                      <Checkbox
                        color="green"
                        aria-label={`Sélectionner ${contactName(contact)}`}
                        checked={selected.has(contact.id)}
                        onChange={(checked) => toggle(contact.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="contact-name block max-w-full truncate text-left font-medium text-zinc-950 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-4"
                            onClick={() => onContact(contact)}
                          >
                            {contactName(contact)}
                          </button>
                          <div className="truncate text-xs/5 text-zinc-500">
                            {contact.emails[0] ?? 'E-mail non renseigné'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {formatPhoneNumber(contact.phones[0]) || '—'}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {contact.animals.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {(contact.animalTypes ?? []).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {contact.lastAppointment
                        ? appointmentDate(contact.lastAppointment)
                        : '—'}
                    </TableCell>
                    <TableCell>{listBadges(contact)}</TableCell>
                    <TableCell>
                      <ContactActions contact={contact} onEdit={onContact} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-zinc-950/10 md:hidden">
            <div className="flex items-center gap-3 pb-3">
              <Checkbox
                color="green"
                aria-label="Sélectionner cette page"
                checked={selectedOnPage === visible.length}
                indeterminate={
                  selectedOnPage > 0 && selectedOnPage < visible.length
                }
                onChange={(checked) =>
                  setSelected((previous) => {
                    const next = new Set(previous);
                    for (const contact of visible)
                      checked ? next.add(contact.id) : next.delete(contact.id);
                    return next;
                  })
                }
              />
              <span className="text-sm text-zinc-500">
                Sélectionner cette page
              </span>
            </div>
            {visible.map((contact) => (
              <article key={contact.id} className="py-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    color="green"
                    aria-label={`Sélectionner ${contactName(contact)}`}
                    checked={selected.has(contact.id)}
                    onChange={(checked) => toggle(contact.id, checked)}
                  />
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="contact-name text-left text-sm font-medium text-zinc-950"
                      onClick={() => onContact(contact)}
                    >
                      {contactName(contact)}
                    </button>
                    <p className="break-all text-xs/5 text-zinc-500">
                      {contact.emails[0] ?? 'E-mail non renseigné'}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <ContactActions contact={contact} onEdit={onContact} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 pl-8 text-xs/5">
                  <div>
                    <dt className="text-zinc-500">Téléphone</dt>
                    <dd className="text-zinc-700">
                      {formatPhoneNumber(contact.phones[0]) || 'Non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Animal / animaux</dt>
                    <dd className="text-zinc-700">
                      {contact.animals.join(', ') || 'Non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Type d’animal</dt>
                    <dd className="text-zinc-700">
                      {(contact.animalTypes ?? []).join(', ') ||
                        'Non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Dernier rendez-vous</dt>
                    <dd className="text-zinc-700">
                      {appointmentDate(contact.lastAppointment)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Listes</dt>
                    <dd>{listBadges(contact)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Text id="contacts-page-range">
              {currentPage * pageSize + 1}–
              {Math.min((currentPage + 1) * pageSize, filtered.length)} sur{' '}
              {filtered.length}
            </Text>
            <Pagination aria-label="Pages des contacts">
              <Button
                outline
                disabled={!currentPage}
                onClick={() => setPage(currentPage - 1)}
                id="contacts-prev"
              >
                <ArrowLeftIcon />
                Précédent
              </Button>
              <Button
                outline
                disabled={(currentPage + 1) * pageSize >= filtered.length}
                onClick={() => setPage(currentPage + 1)}
                id="contacts-next"
              >
                Suivant
                <ArrowRightIcon />
              </Button>
            </Pagination>
          </div>
        </>
      )}
      <Text className="mt-8 border-t border-zinc-950/5 pt-4 text-xs/5">
        {source === 'demo'
          ? 'Contacts, animaux et rendez-vous fictifs pour vos essais.'
          : source === 'copy'
            ? 'Vos modifications concernent uniquement la copie en preview.'
            : 'Coordonnées : Google Contacts · Animaux et rendez-vous connus : Calendly'}
        {!model.appointmentsAvailable && ' · Historique Calendly indisponible'}
        {model.updatedAt &&
          ` · Actualisé à ${model.updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}`}
      </Text>
    </div>
  );
}

function ContactActions({
  contact,
  onEdit,
}: {
  contact: GoogleContact;
  onEdit: (contact: GoogleContact) => void;
}) {
  return (
    <Dropdown>
      <DropdownButton plain aria-label={`Actions pour ${contactName(contact)}`}>
        <EllipsisHorizontalIcon />
      </DropdownButton>
      <DropdownMenu anchor="bottom end">
        <DropdownItem onClick={() => onEdit(contact)}>
          <DropdownLabel>Éditer le contact</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
