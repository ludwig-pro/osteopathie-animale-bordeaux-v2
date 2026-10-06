import { useMemo, useState } from 'react';
import {
  ArchiveBoxIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
} from '@heroicons/react/20/solid';
import type { MailingList } from '../contact-types';
import { errorMessage, normalize, type ContactsModel } from './contacts-model';
import { EmptyState, Notice } from './common';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from './ui/dropdown';
import { Heading, Subheading } from './ui/heading';
import { Input, InputGroup } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Text } from './ui/text';

export function ListsPage({
  model,
  onCreate,
  onEdit,
  onArchive,
  onOpen,
  notice,
  onNotice,
}: {
  model: ContactsModel;
  onCreate: () => void;
  onEdit: (list: MailingList) => void;
  onArchive: (list: MailingList) => void;
  onOpen: (list: MailingList) => void;
  notice: string;
  onNotice: (message: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [restoring, setRestoring] = useState('');
  const [error, setError] = useState('');
  const filtered = model.lists.lists.filter((list) =>
    normalize(`${list.name} ${list.description}`).includes(normalize(search))
  );
  const contactIds = useMemo(
    () => new Set(model.contacts.map((contact) => contact.id)),
    [model.contacts]
  );
  const archives = model.lists.archivedLists ?? [];
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading>Listes de diffusion</Heading>
          <Text className="mt-1">
            Les bons destinataires pour chaque nouvelle.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button
            outline
            aria-label="Actualiser les listes"
            disabled={model.loading}
            onClick={() => {
              void model.refresh();
            }}
          >
            <ArrowPathIcon />
          </Button>
          <Button
            onClick={onCreate}
            disabled={!model.listsReady}
            id="list-create"
          >
            <PlusIcon />
            Créer une liste
          </Button>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {model.listsError && <Notice>{model.listsError}</Notice>}
        {error && <Notice>{error}</Notice>}
        {notice && <Notice success>{notice}</Notice>}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <InputGroup className="w-full sm:max-w-sm">
          <MagnifyingGlassIcon />
          <Input
            aria-label="Rechercher une liste"
            placeholder="Rechercher une liste…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <Text>
          {model.lists.lists.length} liste
          {model.lists.lists.length > 1 ? 's' : ''}
        </Text>
      </div>
      {!model.listsReady ? (
        <EmptyState
          title={
            model.listsError
              ? 'Listes de diffusion indisponibles'
              : 'Vos listes arrivent…'
          }
          description={
            model.listsError
              ? 'Vérifiez leur configuration puis actualisez les listes.'
              : 'Lecture de vos listes de diffusion.'
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          title={
            search
              ? 'Aucune liste ne correspond.'
              : 'Votre première liste commence ici.'
          }
          description={
            search
              ? 'Essayez un autre nom ou effacez votre recherche.'
              : 'Créez une liste, puis ajoutez des contacts depuis leur fiche ou une sélection multiple.'
          }
          action={search ? 'Effacer la recherche' : 'Créer une liste'}
          onAction={search ? () => setSearch('') : onCreate}
        />
      ) : (
        <Table className="mt-6" id="mailing-lists-table">
          <TableHead>
            <TableRow>
              <TableHeader>Liste</TableHeader>
              <TableHeader>Contacts</TableHeader>
              <TableHeader className="hidden sm:table-cell">
                Accords confirmés
              </TableHeader>
              <TableHeader>
                <span className="sr-only">Actions</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((list) => {
              const memberships = model.lists.memberships.filter(
                (membership) =>
                  membership.listId === list.id &&
                  contactIds.has(membership.contactId)
              );
              return (
                <TableRow key={list.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium text-zinc-950 hover:text-green-700"
                      onClick={() => onOpen(list)}
                    >
                      {list.name}
                    </button>
                    <p className="max-w-sm text-wrap text-xs/5 text-zinc-500">
                      {list.description || 'Aucune description'}
                    </p>
                  </TableCell>
                  <TableCell>
                    {model.ready ? memberships.length : '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge color="green">
                      {model.ready
                        ? memberships.filter(
                            (membership) => membership.status === 'confirmed'
                          ).length
                        : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dropdown>
                      <DropdownButton
                        plain
                        aria-label={`Actions pour ${list.name}`}
                      >
                        <EllipsisHorizontalIcon />
                      </DropdownButton>
                      <DropdownMenu anchor="bottom end">
                        <DropdownItem onClick={() => onEdit(list)}>
                          <PencilSquareIcon />
                          <DropdownLabel>Modifier la liste</DropdownLabel>
                        </DropdownItem>
                        <DropdownItem onClick={() => onArchive(list)}>
                          <ArchiveBoxIcon />
                          <DropdownLabel>Archiver</DropdownLabel>
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <div className="mt-8 rounded-lg border border-zinc-950/10 bg-zinc-50 p-5">
        <Subheading>Un contact peut appartenir à plusieurs listes</Subheading>
        <Text className="mt-1">
          Les nouvelles affectations sont marquées « Accord à confirmer ». Les
          désinscriptions restent conservées pour les futurs envois.
        </Text>
      </div>
      {archives.length > 0 && (
        <div className="mt-8">
          <Button
            plain
            onClick={() => setArchivesOpen(!archivesOpen)}
            aria-expanded={archivesOpen}
          >
            <ArchiveBoxIcon />
            Listes archivées ({archives.length})
          </Button>
          {archivesOpen && (
            <Table className="mt-4" id="mailing-list-archives">
              <TableHead>
                <TableRow>
                  <TableHeader>Liste archivée</TableHeader>
                  <TableHeader>
                    <span className="sr-only">Restaurer</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {archives.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell>
                      <span className="font-medium">{list.name}</span>
                      <p className="text-wrap text-xs/5 text-zinc-500">
                        {list.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        outline
                        disabled={Boolean(restoring)}
                        onClick={async () => {
                          setRestoring(list.id);
                          setError('');
                          try {
                            await model.mutation(
                              '/api/mailing-lists',
                              'PATCH',
                              { id: list.id, restore: true }
                            );
                            await model.reloadLists();
                            onNotice(
                              'Liste restaurée avec ses affectations et accords.'
                            );
                          } catch (failure) {
                            setError(
                              errorMessage(
                                failure,
                                'Restauration non confirmée. Actualisez les listes avant de réessayer.'
                              )
                            );
                          } finally {
                            setRestoring('');
                          }
                        }}
                      >
                        <ArrowUturnLeftIcon />
                        {restoring === list.id ? 'Restauration…' : 'Restaurer'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
