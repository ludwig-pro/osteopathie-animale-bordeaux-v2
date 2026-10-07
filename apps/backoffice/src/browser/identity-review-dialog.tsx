import { useEffect, useMemo, useState } from 'react';
import type { GoogleContact } from '../contact-types';
import { identitySuggestion, type ContactAnimal } from '../contact-identity';
import {
  contactName,
  errorMessage,
  normalize,
  type ContactsModel,
} from './contacts-model';
import { Dialog, DialogTitle, DialogBody, DialogActions } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox, CheckboxField } from './ui/checkbox';
import { Field, Label } from './ui/fieldset';
import { Text } from './ui/text';
import { Notice } from './common';

type HistoryRow = {
  id: string;
  action: string;
  before: GoogleContact;
  after: GoogleContact;
  createdAt: string;
};
function IdentityEditor({
  contact,
  model,
  onSaved,
  onBusy,
}: {
  contact: GoogleContact;
  model: ContactsModel;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const suggestion = identitySuggestion(contact);
  const [givenName, setGivenName] = useState(suggestion.givenName);
  const [familyName, setFamilyName] = useState(suggestion.familyName);
  const [animals, setAnimals] = useState<ContactAnimal[]>(suggestion.animals);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyError, setHistoryError] = useState('');
  useEffect(() => {
    let active = true;
    void model
      .identityHistory(contact.id)
      .then((result) => {
        if (active) setHistory((result as { history: HistoryRow[] }).history);
      })
      .catch(() => {
        if (active)
          setHistoryError(
            'Historique indisponible. Fermez puis rouvrez la revue pour réessayer.'
          );
      });
    return () => {
      active = false;
    };
  }, [contact.id, model.identityHistory]);
  const change = () => setConfirmed(false);
  const submit = async (input: unknown) => {
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      await model.mutation('/api/contact-identity', 'POST', input);
      if (!(await model.refresh())) {
        setError(
          'Correction enregistrée. Rechargez la page avant de poursuivre.'
        );
        return;
      }
      onSaved();
    } catch (failure) {
      setError(
        errorMessage(failure, 'Impossible d’enregistrer la correction.')
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  return (
    <div className="min-w-0">
      <div className="mb-5 rounded-lg bg-zinc-50 p-4">
        <p className="text-xs font-medium text-zinc-500">Nom d’origine</p>
        <p className="mt-1 break-words text-sm text-zinc-950">
          {contact.identity?.originalName ?? contact.name}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Actuellement : {contactName(contact)}
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmed && !busy)
            void submit({
              action: 'apply',
              id: contact.id,
              etag: contact.etag,
              givenName,
              familyName,
              animals,
            });
        }}
      >
        {suggestion.uncertainOrder && (
          <Text className="mb-4">
            La proposition suppose « Nom Prénom ». Vérifiez l’ordre, notamment
            pour les noms composés.
          </Text>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field disabled={busy}>
            <Label>Prénom</Label>
            <Input
              value={givenName}
              maxLength={200}
              onChange={(e) => {
                setGivenName(e.target.value);
                change();
              }}
            />
          </Field>
          <Field disabled={busy}>
            <Label>Nom de famille</Label>
            <Input
              value={familyName}
              maxLength={200}
              onChange={(e) => {
                setFamilyName(e.target.value);
                change();
              }}
            />
          </Field>
        </div>
        <Button
          plain
          className="mt-2"
          disabled={busy}
          onClick={() => {
            setGivenName(familyName);
            setFamilyName(givenName);
            change();
          }}
        >
          Inverser prénom et nom
        </Button>
        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-950">Animaux</p>
          <Text className="mt-1 mb-3">
            Un animal par ligne. Les parenthèses sont une proposition à
            vérifier.
          </Text>
          <div className="space-y-3">
            {animals.map((animal, index) => (
              <div className="flex items-start gap-2" key={animal.id}>
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label={`Nom de l’animal ${index + 1}`}
                    value={animal.name}
                    maxLength={200}
                    disabled={busy}
                    onChange={(e) => {
                      setAnimals(
                        animals.map((a) =>
                          a.id === animal.id
                            ? { ...a, name: e.target.value, source: 'manual' }
                            : a
                        )
                      );
                      change();
                    }}
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    {animal.source === 'name'
                      ? 'Proposé depuis les parenthèses'
                      : animal.source === 'calendly'
                        ? 'Issu des rendez-vous Calendly'
                        : 'Saisi manuellement'}
                  </p>
                </div>
                <Button
                  plain
                  disabled={busy}
                  aria-label={`Retirer l’animal ${index + 1}`}
                  onClick={() => {
                    setAnimals(animals.filter((a) => a.id !== animal.id));
                    change();
                  }}
                >
                  Retirer
                </Button>
              </div>
            ))}
          </div>
          <Button
            outline
            className="mt-3"
            disabled={busy || animals.length >= 30}
            onClick={() => {
              setAnimals([
                ...animals,
                { id: crypto.randomUUID(), name: '', source: 'manual' },
              ]);
              change();
            }}
          >
            Ajouter un animal
          </Button>
        </div>
        <div className="mt-6 border-t border-zinc-950/10 pt-4">
          <Text>
            Après correction :{' '}
            <strong className="text-zinc-950">
              {[givenName.trim(), familyName.trim()]
                .filter(Boolean)
                .join(' ') || 'Nom manquant'}
            </strong>
          </Text>
        </div>
        <CheckboxField className="mt-4">
          <Checkbox
            checked={confirmed}
            disabled={busy}
            onChange={setConfirmed}
          />
          <Label>J’ai vérifié le prénom, le nom et les animaux.</Label>
        </CheckboxField>
        {error && (
          <div className="mt-4">
            <Notice>{error}</Notice>
          </div>
        )}
        <Button
          className="mt-5"
          type="submit"
          disabled={
            busy ||
            !confirmed ||
            !(givenName.trim() || familyName.trim()) ||
            animals.some((a) => !a.name.trim())
          }
        >
          {busy ? 'Enregistrement…' : 'Valider la correction'}
        </Button>
      </form>
      <details className="mt-6 border-t border-zinc-950/10 pt-4">
        <summary className="cursor-pointer text-sm font-medium">
          Historique des corrections ({history.length})
        </summary>
        {historyError && <Notice>{historyError}</Notice>}
        {!history.length && !historyError && (
          <Text className="mt-3">Aucune correction enregistrée.</Text>
        )}
        {history.map((item) => (
          <div
            key={item.id}
            className="mt-3 rounded-lg border border-zinc-950/10 p-3 text-sm"
          >
            <p className="text-xs text-zinc-500">
              {new Date(item.createdAt).toLocaleString('fr-FR')} ·{' '}
              {item.action === 'restore' ? 'Annulation' : 'Correction'}
            </p>
            <p className="mt-1 break-words">
              {item.before.name} → {item.after.name}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Animaux : {item.before.animals.join(', ') || 'aucun'} →{' '}
              {item.after.animals.join(', ') || 'aucun'}
            </p>
            {item.after.etag === contact.etag && (
              <Button
                outline
                className="mt-2"
                disabled={busy}
                onClick={() =>
                  void submit({
                    action: 'restore',
                    id: contact.id,
                    etag: contact.etag,
                    reviewId: item.id,
                  })
                }
              >
                Annuler cette étape
              </Button>
            )}
          </div>
        ))}
      </details>
    </div>
  );
}

export function IdentityReviewDialog({
  model,
  initialId,
  onClose,
}: {
  model: ContactsModel;
  initialId?: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(!initialId);
  const [selected, setSelected] = useState(initialId ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const pending = useMemo(
    () =>
      new Set(
        model.contacts
          .filter((c) => identitySuggestion(c).needsReview)
          .map((c) => c.id)
      ),
    [model.contacts]
  );
  const contacts = model.contacts
    .filter(
      (c) =>
        (!onlyPending || pending.has(c.id)) &&
        normalize(
          [contactName(c), c.identity?.originalName ?? '', ...c.animals].join(
            ' '
          )
        ).includes(normalize(search))
    )
    .sort((a, b) => contactName(a).localeCompare(contactName(b), 'fr'));
  const contact = model.contacts.find((c) => c.id === selected) ?? contacts[0];
  return (
    <Dialog
      open
      size="5xl"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <DialogTitle>Corriger les contacts</DialogTitle>
      <Text className="mt-2">
        {pending.size}{' '}
        {pending.size === 1 ? 'fiche à vérifier' : 'fiches à vérifier'}. Chaque
        correction est appliquée uniquement à cet environnement.
      </Text>
      <DialogBody>
        {notice && (
          <div className="mb-4">
            <Notice success>{notice}</Notice>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <aside>
            <Input
              aria-label="Rechercher une fiche à corriger"
              placeholder="Rechercher une fiche…"
              value={search}
              disabled={busy}
              onChange={(e) => setSearch(e.target.value)}
            />
            <CheckboxField className="my-3">
              <Checkbox
                checked={onlyPending}
                disabled={busy}
                onChange={setOnlyPending}
              />
              <Label>À vérifier uniquement</Label>
            </CheckboxField>
            <div className="max-h-48 overflow-y-auto md:max-h-96">
              {contacts.slice(0, 100).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={busy}
                  aria-pressed={contact?.id === c.id}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm ${contact?.id === c.id ? 'bg-green-50 font-medium text-green-900' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  onClick={() => {
                    setSelected(c.id);
                    setNotice('');
                  }}
                >
                  {contactName(c)}
                </button>
              ))}
            </div>
            {contacts.length > 100 && (
              <Text className="mt-2 text-xs">
                Affinez la recherche pour retrouver les autres fiches.
              </Text>
            )}
          </aside>
          {contact ? (
            <IdentityEditor
              key={`${contact.id}:${contact.etag}`}
              contact={contact}
              model={model}
              onBusy={setBusy}
              onSaved={() => {
                setSelected(contact.id);
                setNotice(
                  'Correction enregistrée. Vous pouvez poursuivre avec une autre fiche ou consulter l’historique.'
                );
              }}
            />
          ) : (
            <Text>Aucune fiche à vérifier.</Text>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <Button outline disabled={busy} onClick={onClose}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
