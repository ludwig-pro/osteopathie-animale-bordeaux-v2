import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import type { GoogleContact } from '../contact-types';
import {
  appointmentDate,
  contactName,
  initials,
  normalize,
  type ContactsModel,
} from './contacts-model';
import { EmptyState, Notice } from './common';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogTitle, DialogBody, DialogActions } from './ui/dialog';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from './ui/dropdown';
import { Field, FieldGroup, Label } from './ui/fieldset';
import { Heading } from './ui/heading';
import { Input, InputGroup } from './ui/input';
import { Listbox, ListboxLabel, ListboxOption } from './ui/listbox';
import { Pagination } from './ui/pagination';
import { Select } from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Text } from './ui/text';

type Filters = { label: string; email: string };
const sorting = [
  { value: 'asc', label: 'Nom : A → Z' },
  { value: 'desc', label: 'Nom : Z → A' },
  { value: 'recent', label: 'Dernier rendez-vous' },
];

function FiltersDialog({
  model,
  current,
  onApply,
  onClose,
}: {
  model: ContactsModel;
  current: Filters;
  onApply: (filters: Filters) => void;
  onClose: () => void;
}) {
  const [filters, setFilters] = useState(current);
  return (
    <Dialog open onClose={onClose} size="md">
      <DialogTitle>Filtrer les contacts</DialogTitle>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApply(filters);
          onClose();
        }}
      >
        <DialogBody>
          <FieldGroup className="space-y-5">
            <Field>
              <Label>Libellé Google</Label>
              <Select
                id="contacts-label"
                value={filters.label}
                onChange={(event) =>
                  setFilters({ ...filters, label: event.target.value })
                }
              >
                <option value="">Tous les libellés</option>
                <option value="__unlabelled">Sans libellé</option>
                {model.labels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Adresse e-mail</Label>
              <Select
                id="contacts-email-filter"
                value={filters.email}
                onChange={(event) =>
                  setFilters({ ...filters, email: event.target.value })
                }
              >
                <option value="all">Toutes les fiches</option>
                <option value="with">Avec un e-mail</option>
                <option value="without">Sans e-mail</option>
              </Select>
            </Field>
          </FieldGroup>
        </DialogBody>
        <DialogActions>
          <Button outline onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">Appliquer les filtres</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function ContactsPage({
  source = 'google',
  onCopy,
  model,
  listFilter,
  onListFilter,
  onContact,
  onBulk,
  onLists,
  notice,
}: {
  model: ContactsModel;
  source?: 'google' | 'demo' | 'copy';
  onCopy?: () => void;
  listFilter: string;
  onListFilter: (value: string) => void;
  onContact: (contact: GoogleContact) => void;
  onBulk: (ids: string[], done: () => void) => void;
  onLists: () => void;
  notice: string;
}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ label: '', email: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('asc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageSize = 25;
  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    const labels = new Set(model.labels.map((label) => label.id));
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
              ...contact.emails,
              ...contact.phones,
              ...contact.animals,
            ].join(' ')
          ).includes(query)
        )
          return false;
        if (filters.email === 'with' && !contact.emails.length) return false;
        if (filters.email === 'without' && contact.emails.length) return false;
        if (
          filters.label === '__unlabelled' &&
          contact.labelIds.some((id) => labels.has(id))
        )
          return false;
        if (
          filters.label &&
          filters.label !== '__unlabelled' &&
          !contact.labelIds.includes(filters.label)
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
      .sort((a, b) =>
        sort === 'recent'
          ? (b.lastAppointment ?? '').localeCompare(a.lastAppointment ?? '') ||
            collator.compare(contactName(a), contactName(b))
          : (sort === 'desc' ? -1 : 1) *
            collator.compare(contactName(a), contactName(b))
      );
  }, [
    model.contacts,
    model.labels,
    model.memberships,
    search,
    filters,
    listFilter,
    sort,
  ]);
  useEffect(() => {
    setPage(0);
  }, [search, filters, listFilter, sort]);
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
  const activeFilters =
    Number(Boolean(filters.label)) + Number(filters.email !== 'all');
  const hasFilters = Boolean(search || listFilter || activeFilters);
  const reset = () => {
    setSearch('');
    setFilters({ label: '', email: 'all' });
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
        <div>
          <Heading>Contacts</Heading>
          <Text className="mt-1">
            Votre carnet d’adresses et le lien avec vos clients.
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onCopy && (
            <Button outline onClick={onCopy}>
              Copier en preview
            </Button>
          )}
          <Button outline onClick={onLists}>
            <TagIcon />
            Gérer les listes
          </Button>
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
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-zinc-950/10 py-4 text-sm/6 text-zinc-500">
        <span>
          <strong id="contacts-total" className="font-semibold text-zinc-950">
            {model.ready ? model.contacts.length : '—'}
          </strong>{' '}
          contacts
        </span>
        <span>
          <strong className="font-semibold text-zinc-950">
            {model.ready
              ? model.contacts.filter((contact) => contact.emails.length).length
              : '—'}
          </strong>{' '}
          avec un e-mail
        </span>
        <span>
          <strong
            id="contacts-lists-total"
            className="font-semibold text-zinc-950"
          >
            {model.listsReady ? model.lists.lists.length : '—'}
          </strong>{' '}
          listes de diffusion
        </span>
        <span className="ml-auto inline-flex items-center gap-2 text-xs/5">
          <span
            className="size-1.5 rounded-full bg-green-600"
            aria-hidden="true"
          />
          {source === 'demo'
            ? 'Contacts fictifs'
            : source === 'copy'
              ? 'Copie des contacts Google'
              : 'Google Contacts'}
        </span>
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
        <div className="min-w-0 flex-1 basis-48 sm:max-w-60">
          <Listbox
            value={listFilter}
            onChange={onListFilter}
            aria-label="Liste de diffusion"
            disabled={!model.ready || !model.listsReady}
          >
            <ListboxOption value="">
              <ListboxLabel>Toutes les listes</ListboxLabel>
            </ListboxOption>
            <ListboxOption value="__unassigned">
              <ListboxLabel>Sans liste</ListboxLabel>
            </ListboxOption>
            {model.lists.lists.map((list) => (
              <ListboxOption key={list.id} value={list.id}>
                <ListboxLabel>{list.name}</ListboxLabel>
              </ListboxOption>
            ))}
          </Listbox>
        </div>
        <Button
          outline
          disabled={!model.ready}
          onClick={() => setShowFilters(true)}
        >
          <AdjustmentsHorizontalIcon />
          Filtres
          {activeFilters > 0 && <Badge color="green">{activeFilters}</Badge>}
        </Button>
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
              Effacer les filtres
            </Button>
          )}
        </div>
        <Dropdown>
          <DropdownButton plain disabled={!model.ready}>
            {sorting.find((item) => item.value === sort)?.label}
            <ChevronDownIcon />
          </DropdownButton>
          <DropdownMenu anchor="bottom end">
            {sorting.map((item) => (
              <DropdownItem
                key={item.value}
                onClick={() => setSort(item.value)}
              >
                <DropdownLabel>{item.label}</DropdownLabel>
                {sort === item.value && <CheckIcon />}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>
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
          action={hasFilters ? 'Effacer les filtres' : undefined}
          onAction={reset}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <Table dense className="contacts-table">
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
                  <TableHeader>Nom et e-mail</TableHeader>
                  <TableHeader>Téléphone</TableHeader>
                  <TableHeader>Animal / animaux</TableHeader>
                  <TableHeader>Dernier rendez-vous</TableHeader>
                  <TableHeader>Listes</TableHeader>
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
                        <Avatar
                          initials={initials(contactName(contact))}
                          className="size-9 shrink-0 bg-zinc-100 text-zinc-700"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="contact-name font-medium text-zinc-950 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-4"
                            onClick={() => onContact(contact)}
                          >
                            {contactName(contact)}
                          </button>
                          <div className="text-xs/5 text-zinc-500">
                            {contact.emails[0] ?? 'E-mail non renseigné'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {contact.phones[0] ?? '—'}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {contact.animals.join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-zinc-600">
                      {contact.lastAppointment
                        ? appointmentDate(contact.lastAppointment)
                        : '—'}
                    </TableCell>
                    <TableCell>{listBadges(contact)}</TableCell>
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
                  <Avatar
                    initials={initials(contactName(contact))}
                    className="size-9 shrink-0 bg-zinc-100 text-zinc-700"
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
                <dl className="mt-3 grid grid-cols-2 gap-3 pl-8 text-xs/5">
                  <div>
                    <dt className="text-zinc-500">Téléphone</dt>
                    <dd className="text-zinc-700">
                      {contact.phones[0] ?? 'Non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Animal / animaux</dt>
                    <dd className="text-zinc-700">
                      {contact.animals.join(', ') || 'Non renseigné'}
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
      {showFilters && (
        <FiltersDialog
          model={model}
          current={filters}
          onApply={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
