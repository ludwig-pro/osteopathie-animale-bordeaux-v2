import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import {
  XMarkIcon,
  UserIcon,
  TagIcon,
  CheckIcon,
} from '@heroicons/react/20/solid';
import type {
  GoogleContact,
  MailingList,
  SubscriptionStatus,
} from '../contact-types';
import {
  appointmentDate,
  contactName,
  errorMessage,
  initials,
  type ContactsModel,
} from './contacts-model';
import { Notice } from './common';
import { Alert, AlertTitle, AlertDescription, AlertActions } from './ui/alert';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox, CheckboxField, CheckboxGroup } from './ui/checkbox';
import {
  DescriptionList,
  DescriptionTerm,
  DescriptionDetails,
} from './ui/description-list';
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogActions,
} from './ui/dialog';
import { Description, Field, FieldGroup, Label } from './ui/fieldset';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Text } from './ui/text';
import { Textarea } from './ui/textarea';

export function ContactDialog({
  original,
  model,
  onClose,
}: {
  original: GoogleContact;
  model: ContactsModel;
  onClose: () => void;
}) {
  const contact =
    model.contacts.find((item) => item.id === original.id) ?? original;
  const [givenName, setGivenName] = useState(
    original.givenName || (!original.familyName ? original.name : '')
  );
  const [familyName, setFamilyName] = useState(original.familyName);
  const [emails, setEmails] = useState(original.emails.join('\n'));
  const [phones, setPhones] = useState(original.phones.join('\n'));
  const [statuses, setStatuses] = useState<
    Record<string, SubscriptionStatus | 'none'>
  >(() =>
    Object.fromEntries(
      model.lists.lists.map((list) => [
        list.id,
        model.memberships
          .get(original.id)
          ?.find((item) => item.listId === list.id)?.status ?? 'none',
      ])
    )
  );
  const [busy, setBusy] = useState(false);
  const [requiresRefresh, setRequiresRefresh] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);
  const lines = (value: string) =>
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      size="xl"
      id="contact-detail"
    >
      <div className="flex items-start gap-3.5">
        <Avatar
          initials={initials(contactName(contact))}
          className="size-12 bg-zinc-100 text-zinc-700"
        />
        <div className="min-w-0 flex-1">
          <DialogTitle className="break-words">
            {contactName(contact)}
          </DialogTitle>
          <DialogDescription className="break-all">
            {contact.emails[0] ?? 'Fiche Google Contacts'}
          </DialogDescription>
        </div>
        <Button
          plain
          aria-label="Fermer la fiche"
          onClick={onClose}
          disabled={busy}
        >
          <XMarkIcon />
        </Button>
      </div>
      <DialogBody>
        <DescriptionList className="mb-5">
          <DescriptionTerm>Animal / animaux</DescriptionTerm>
          <DescriptionDetails>
            {contact.animals.join(', ') || 'Non renseigné'}
          </DescriptionDetails>
          <DescriptionTerm>Dernier rendez-vous connu</DescriptionTerm>
          <DescriptionDetails>
            {appointmentDate(contact.lastAppointment)}
          </DescriptionDetails>
          <DescriptionTerm>Libellés Google</DescriptionTerm>
          <DescriptionDetails>
            <div className="flex flex-wrap gap-1.5">
              {model.labels
                .filter((label) => contact.labelIds.includes(label.id))
                .map((label) => (
                  <Badge key={label.id} color="zinc">
                    {label.name}
                  </Badge>
                ))}
              {!model.labels.some((label) =>
                contact.labelIds.includes(label.id)
              ) && 'Sans libellé'}
            </div>
          </DescriptionDetails>
        </DescriptionList>
        <TabGroup onChange={() => setFeedback('')}>
          <TabList className="mb-6 flex gap-5 border-b border-zinc-950/10">
            <Tab className="contact-tab">
              <UserIcon className="size-4" aria-hidden="true" />
              Coordonnées
            </Tab>
            <Tab className="contact-tab">
              <TagIcon className="size-4" aria-hidden="true" />
              Listes de diffusion
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setFeedback('');
                  try {
                    await model.mutation('/api/contact', 'PATCH', {
                      id: contact.id,
                      etag: contact.etag,
                      givenName,
                      familyName,
                      emails: lines(emails),
                      phones: lines(phones),
                    });
                    const refreshed = await model.refresh();
                    setRequiresRefresh(!refreshed);
                    setSaved(true);
                    setFeedback(
                      refreshed
                        ? 'Coordonnées enregistrées dans Google Contacts.'
                        : 'Coordonnées enregistrées. Actualisez les contacts avant une nouvelle modification.'
                    );
                  } catch (error) {
                    setSaved(false);
                    setFeedback(
                      errorMessage(
                        error,
                        'Enregistrement non confirmé. Actualisez la fiche avant de réessayer.'
                      )
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <FieldGroup className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field disabled={busy}>
                      <Label>Prénom</Label>
                      <Input
                        id="contact-given-name"
                        value={givenName}
                        onChange={(event) => setGivenName(event.target.value)}
                        maxLength={200}
                      />
                    </Field>
                    <Field disabled={busy}>
                      <Label>Nom</Label>
                      <Input
                        id="contact-family-name"
                        value={familyName}
                        onChange={(event) => setFamilyName(event.target.value)}
                        maxLength={200}
                      />
                    </Field>
                  </div>
                  <Field disabled={busy}>
                    <Label>E-mails</Label>
                    <Textarea
                      id="contact-emails"
                      rows={2}
                      value={emails}
                      onChange={(event) => setEmails(event.target.value)}
                    />
                    <Description>Une adresse par ligne.</Description>
                  </Field>
                  <Field disabled={busy}>
                    <Label>Téléphones</Label>
                    <Textarea
                      id="contact-phones"
                      rows={2}
                      value={phones}
                      onChange={(event) => setPhones(event.target.value)}
                    />
                    <Description>Un numéro par ligne.</Description>
                  </Field>
                </FieldGroup>
                <Text className="mt-4 text-xs/5">
                  Les animaux et rendez-vous connus proviennent de Calendly. Les
                  coordonnées issues de cet historique peuvent être ajoutées à
                  nouveau lors d’une synchronisation.
                </Text>
                {feedback && (
                  <div className="mt-4">
                    <Notice success={saved}>{feedback}</Notice>
                  </div>
                )}
                {!contact.etag && (
                  <Text className="mt-4">
                    Actualisez cette fiche avant de la modifier.
                  </Text>
                )}
                <DialogActions>
                  <Button outline onClick={onClose} disabled={busy}>
                    Fermer
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || !contact.etag || requiresRefresh}
                    id="contact-save"
                  >
                    {busy ? 'Enregistrement…' : 'Enregistrer les coordonnées'}
                  </Button>
                </DialogActions>
              </form>
            </TabPanel>
            <TabPanel>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setFeedback('');
                  try {
                    const memberships = model.lists.lists.flatMap((list) => {
                      const status = statuses[list.id];
                      return status && status !== 'none'
                        ? [{ listId: list.id, status }]
                        : [];
                    });
                    await model.mutation('/api/list-memberships', 'PUT', {
                      contactId: contact.id,
                      memberships,
                    });
                    await model.reloadLists();
                    setSaved(true);
                    setFeedback('Affectations et accords enregistrés.');
                  } catch (error) {
                    setSaved(false);
                    setFeedback(
                      errorMessage(
                        error,
                        'Enregistrement des listes non confirmé. Actualisez avant de réessayer.'
                      )
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Text className="mb-5">
                  Indiquez l’accord du contact pour chaque liste avant les
                  futurs envois.
                </Text>
                <FieldGroup className="space-y-5">
                  {model.lists.lists.map((list) => (
                    <Field key={list.id} disabled={busy || !model.listsReady}>
                      <Label>{list.name}</Label>
                      <Select
                        data-list-id={list.id}
                        value={statuses[list.id] ?? 'none'}
                        onChange={(event) =>
                          setStatuses({
                            ...statuses,
                            [list.id]: event.target.value as
                              SubscriptionStatus | 'none',
                          })
                        }
                      >
                        <option value="none">Hors de cette liste</option>
                        <option value="pending">Accord à confirmer</option>
                        <option value="confirmed">Accord confirmé</option>
                        <option value="unsubscribed">Désinscrit</option>
                      </Select>
                    </Field>
                  ))}
                </FieldGroup>
                {!model.lists.lists.length && (
                  <Text>
                    Créez une liste depuis « Listes de diffusion » pour y
                    affecter ce contact.
                  </Text>
                )}
                {feedback && (
                  <div className="mt-4">
                    <Notice success={saved}>{feedback}</Notice>
                  </div>
                )}
                <DialogActions>
                  <Button outline onClick={onClose} disabled={busy}>
                    Fermer
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      busy || !model.listsReady || !model.lists.lists.length
                    }
                    id="contact-lists-save"
                  >
                    {busy ? 'Enregistrement…' : 'Enregistrer les listes'}
                  </Button>
                </DialogActions>
              </form>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </DialogBody>
    </Dialog>
  );
}

export function ListDialog({
  list,
  model,
  onClose,
  onSaved,
}: {
  list?: MailingList;
  model: ContactsModel;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(list?.name ?? '');
  const [description, setDescription] = useState(list?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      size="lg"
      id="list-editor"
    >
      <DialogTitle>
        {list ? 'Modifier la liste' : 'Créer une liste'}
      </DialogTitle>
      <DialogDescription>
        Un groupe de destinataires pour vos prochaines nouvelles.
      </DialogDescription>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            await model.mutation(
              '/api/mailing-lists',
              list ? 'PATCH' : 'POST',
              { ...(list ? { id: list.id } : {}), name, description }
            );
            await model.reloadLists();
            onSaved(
              list
                ? 'Liste mise à jour.'
                : 'Liste créée. Vous pouvez maintenant y ajouter des contacts.'
            );
            onClose();
          } catch (failure) {
            setError(
              errorMessage(
                failure,
                'Enregistrement non confirmé. Actualisez les listes avant de réessayer.'
              )
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <DialogBody>
          <FieldGroup className="space-y-5">
            <Field disabled={busy}>
              <Label>Nom de la liste</Label>
              <Input
                id="list-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                placeholder="Ex. Compagnons canins"
                data-autofocus
              />
            </Field>
            <Field disabled={busy}>
              <Label>Description</Label>
              <Textarea
                id="list-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="À qui s’adressent les prochaines nouvelles ?"
              />
              <Description>
                Facultatif. Quelques mots pour retrouver cette liste.
              </Description>
            </Field>
          </FieldGroup>
          {error && (
            <div className="mt-4">
              <Notice>{error}</Notice>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button outline disabled={busy} onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy} id="list-editor-save">
            {busy ? 'Enregistrement…' : 'Enregistrer la liste'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function ArchiveDialog({
  list,
  model,
  onClose,
  onSaved,
}: {
  list: MailingList;
  model: ContactsModel;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Alert
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      role="alertdialog"
    >
      <AlertTitle>Archiver « {list.name} » ?</AlertTitle>
      <AlertDescription>
        Les contacts restent dans Google Contacts. Les affectations et les
        accords sont conservés pour une éventuelle restauration.
      </AlertDescription>
      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}
      <AlertActions>
        <Button outline onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await model.mutation('/api/mailing-lists', 'DELETE', {
                id: list.id,
              });
              await model.reloadLists();
              onSaved(
                'Liste archivée. Vous pouvez la restaurer depuis les archives.'
              );
              onClose();
            } catch (failure) {
              setError(
                errorMessage(
                  failure,
                  'Archivage non confirmé. Actualisez les listes avant de réessayer.'
                )
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Archivage…' : 'Archiver la liste'}
        </Button>
      </AlertActions>
    </Alert>
  );
}

export function BulkDialog({
  contactIds,
  model,
  onClose,
  onSaved,
}: {
  contactIds: string[];
  model: ContactsModel;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      id="bulk-assign"
    >
      <DialogTitle>Ajouter à des listes</DialogTitle>
      <DialogDescription>
        {contactIds.length} contact
        {contactIds.length > 1 ? 's sélectionnés' : ' sélectionné'}. Choisissez
        une ou plusieurs listes.
      </DialogDescription>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!chosen.size) return;
          setBusy(true);
          setError('');
          try {
            const listIds = [...chosen];
            for (let offset = 0; offset < contactIds.length; offset += 100) {
              for (
                let listOffset = 0;
                listOffset < listIds.length;
                listOffset += 20
              )
                await model.mutation('/api/list-memberships', 'POST', {
                  contactIds: contactIds.slice(offset, offset + 100),
                  listIds: listIds.slice(listOffset, listOffset + 20),
                });
              setProgress(
                `${Math.min(offset + 100, contactIds.length)} contacts sur ${contactIds.length}…`
              );
            }
            await model.reloadLists();
            onSaved(
              `${contactIds.length} contact${contactIds.length > 1 ? 's ajoutés' : ' ajouté'} aux listes sélectionnées.`
            );
            onClose();
          } catch (failure) {
            setError(
              errorMessage(
                failure,
                'Affectation interrompue. Les ajouts déjà enregistrés sont conservés ; réessayez sans créer de doublons.'
              )
            );
            await model.reloadLists().catch(() => undefined);
          } finally {
            setBusy(false);
          }
        }}
      >
        <DialogBody>
          <CheckboxGroup id="bulk-assign-options">
            {model.lists.lists.map((list) => (
              <CheckboxField key={list.id}>
                <Checkbox
                  color="green"
                  disabled={busy}
                  checked={chosen.has(list.id)}
                  onChange={(checked) =>
                    setChosen((previous) => {
                      const next = new Set(previous);
                      checked ? next.add(list.id) : next.delete(list.id);
                      return next;
                    })
                  }
                />
                <Label>{list.name}</Label>
                {list.description && (
                  <Description>{list.description}</Description>
                )}
              </CheckboxField>
            ))}
          </CheckboxGroup>
          <Text className="mt-5">
            Les nouveaux accords seront à confirmer. Les accords et les
            désinscriptions existants seront conservés.
          </Text>
          {error && (
            <div className="mt-4">
              <Notice>{error}</Notice>
            </div>
          )}
          {busy && (
            <Text role="status" className="mt-4">
              {progress || 'Enregistrement des affectations…'}
            </Text>
          )}
        </DialogBody>
        <DialogActions>
          <Button outline onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={busy || !chosen.size}
            id="bulk-assign-save"
          >
            <CheckIcon />
            {busy ? 'Ajout en cours…' : 'Ajouter les contacts'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
