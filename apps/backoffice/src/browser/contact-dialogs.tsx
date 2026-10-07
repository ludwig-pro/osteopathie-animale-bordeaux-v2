import { useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import {
  XMarkIcon,
  UserIcon,
  ClockIcon,
  CheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/20/solid';
import type { GoogleContact, MailingList } from '../contact-types';
import {
  appointmentDate,
  contactName,
  errorMessage,
  type ContactsModel,
} from './contacts-model';
import { Notice } from './common';
import { ContactHistory } from './contact-history';
import { ContactSummary } from './contact-summary';
import { Alert, AlertTitle, AlertDescription, AlertActions } from './ui/alert';
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
import { Text } from './ui/text';
import { Textarea } from './ui/textarea';

export function ContactDialog({
  source = 'google',
  original,
  model,
  onClose,
}: {
  original: GoogleContact;
  source?: 'google' | 'demo' | 'copy';
  model: ContactsModel;
  onClose: () => void;
}) {
  const contact =
    model.contacts.find((item) => item.id === original.id) ?? original;
  const [givenName, setGivenName] = useState(
    original.givenName || (!original.familyName ? original.name : '')
  );
  const [familyName, setFamilyName] = useState(original.familyName);
  const [emails, setEmails] = useState(original.emails[0] ?? '');
  const [phones, setPhones] = useState(original.phones[0] ?? '');
  const [animals, setAnimals] = useState(original.animals);
  const [animalDraft, setAnimalDraft] = useState('');
  const pendingAnimals = () => {
    const name = animalDraft.trim();
    return name &&
      !animals.some(
        (animal) =>
          animal.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr')
      )
      ? [...animals, name]
      : animals;
  };
  const [busy, setBusy] = useState(false);
  const [requiresRefresh, setRequiresRefresh] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);
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
          <DescriptionTerm>Dernier rendez-vous connu</DescriptionTerm>
          <DescriptionDetails>
            {appointmentDate(contact.lastAppointment)}
          </DescriptionDetails>
        </DescriptionList>
        <TabGroup onChange={() => setFeedback('')}>
          <TabList className="mb-6 flex gap-4 overflow-x-auto border-b border-zinc-950/10 sm:gap-5">
            <Tab className="contact-tab shrink-0">
              <DocumentTextIcon className="size-4" aria-hidden="true" />
              Résumé
            </Tab>
            <Tab className="contact-tab">
              <UserIcon className="size-4" aria-hidden="true" />
              Coordonnées
            </Tab>
            <Tab className="contact-tab">
              <ClockIcon className="size-4" aria-hidden="true" />
              Historique
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <ContactSummary key={contact.id} id={contact.id} model={model} />
              <DialogActions>
                <Button outline onClick={onClose} disabled={busy}>
                  Fermer
                </Button>
              </DialogActions>
            </TabPanel>
            <TabPanel>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setFeedback('');
                  let coordinatesSaved = false;
                  try {
                    const coordinatesChanged =
                      givenName !== contact.givenName ||
                      familyName !== contact.familyName ||
                      emails !== (contact.emails[0] ?? '') ||
                      phones !== (contact.phones[0] ?? '');
                    if (coordinatesChanged) {
                      await model.mutation('/api/contact', 'PATCH', {
                        id: contact.id,
                        etag: contact.etag,
                        givenName,
                        familyName,
                        emails: emails.trim() ? [emails.trim()] : [],
                        phones: phones.trim() ? [phones.trim()] : [],
                      });
                      coordinatesSaved = true;
                    }
                    const nextAnimals = pendingAnimals();
                    if (
                      JSON.stringify(nextAnimals) !==
                      JSON.stringify(contact.animals)
                    ) {
                      const result = (await model.mutation(
                        '/api/contact-animals',
                        'PATCH',
                        {
                          id: contact.id,
                          version: contact.animalsVersion ?? '',
                          animals: nextAnimals,
                        }
                      )) as { animals: string[] };
                      setAnimals(result.animals);
                      setAnimalDraft('');
                    }
                    const refreshed = await model.refresh();
                    setRequiresRefresh(!refreshed);
                    setSaved(true);
                    setFeedback(
                      refreshed
                        ? source === 'demo'
                          ? 'Fiche fictive enregistrée.'
                          : source === 'copy'
                            ? 'Fiche enregistrée dans la copie en preview.'
                            : 'Fiche enregistrée.'
                        : 'Fiche enregistrée. Actualisez les contacts avant une nouvelle modification.'
                    );
                  } catch (error) {
                    setSaved(false);
                    const refreshed = await model.refresh();
                    setRequiresRefresh(!refreshed);
                    setFeedback(
                      coordinatesSaved
                        ? 'Les coordonnées sont enregistrées, mais les animaux ne le sont pas. Réessayez l’enregistrement.'
                        : errorMessage(
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
                    <Label>E-mail</Label>
                    <Input
                      id="contact-emails"
                      type="email"
                      maxLength={254}
                      value={emails}
                      onChange={(event) => setEmails(event.target.value)}
                    />
                  </Field>
                  <Field disabled={busy}>
                    <Label>Téléphone</Label>
                    <Input
                      id="contact-phones"
                      type="tel"
                      maxLength={64}
                      value={phones}
                      onChange={(event) => setPhones(event.target.value)}
                    />
                  </Field>
                  <Field disabled={busy}>
                    <Label>Animal / animaux</Label>
                    <div className="mt-2 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-zinc-950/10 bg-white px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                      {animals.map((animal, index) => (
                        <span
                          key={`${animal}-${index}`}
                          className="group inline-flex max-w-full items-center gap-1 rounded-full bg-zinc-100 py-0.5 pl-2.5 pr-1 text-sm text-zinc-700"
                        >
                          <span className="break-words">{animal}</span>
                          <button
                            type="button"
                            aria-label={`Retirer ${animal}`}
                            disabled={busy}
                            onClick={() =>
                              setAnimals(
                                animals.filter(
                                  (_, itemIndex) => itemIndex !== index
                                )
                              )
                            }
                            className="flex size-5 shrink-0 items-center justify-center rounded-full text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-900 focus:opacity-100 focus:outline-2 focus:outline-blue-500 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                          >
                            <XMarkIcon
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        </span>
                      ))}
                      <input
                        id="contact-animals"
                        aria-label="Animal / animaux"
                        placeholder="Ajouter un animal…"
                        className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-zinc-400"
                        value={animalDraft}
                        disabled={busy}
                        maxLength={200}
                        onChange={(event) => setAnimalDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter' &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            setAnimals(pendingAnimals());
                            setAnimalDraft('');
                          }
                        }}
                      />
                    </div>
                    <Description>
                      Appuyez sur Entrée pour ajouter un animal.
                    </Description>
                  </Field>
                </FieldGroup>
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
                    {busy ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </DialogActions>
              </form>
            </TabPanel>
            <TabPanel>
              <ContactHistory
                key={contact.id}
                contact={contact}
                loadReports={model.consultationReports}
              />
              <DialogActions>
                <Button outline onClick={onClose} disabled={busy}>
                  Fermer
                </Button>
              </DialogActions>
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
