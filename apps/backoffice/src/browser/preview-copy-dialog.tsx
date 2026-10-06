import { useState } from 'react';
import type { ContactsTransport } from './contacts-model';
import { errorMessage } from './contacts-model';
import { Notice } from './common';
import { Button } from './ui/button';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import { Text } from './ui/text';

export function PreviewCopyDialog({
  transport,
  onClose,
}: {
  transport: ContactsTransport;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const copy = async () => {
    setBusy(true);
    setError('');
    try {
      const step = async (input: unknown) =>
        (await transport('/api/preview-copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })) as { id: string; copied: number; next: boolean };
      let result = await step({ action: 'start' });
      setCopied(result.copied);
      while (result.next) {
        result = await step({ action: 'continue', id: result.id });
        setCopied(result.copied);
      }
      setDone(true);
    } catch (cause) {
      setError(
        errorMessage(
          cause,
          'La copie a été interrompue. La version précédente reste disponible en preview. Réessayez pour reprendre.'
        )
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <DialogTitle>Copier les contacts en preview</DialogTitle>
      <DialogDescription>
        Lire les contacts Google actuels et préparer une copie indépendante pour
        vos essais.
      </DialogDescription>
      <DialogBody className="space-y-4">
        <Text>
          Cette action remplacera les coordonnées modifiées en preview. Les
          listes de diffusion de chaque environnement restent séparées ; celles
          de la preview sont conservées.
        </Text>
        <Text>
          Les contacts Gmail ne sont pas modifiés. Gardez cette fenêtre ouverte
          pendant la copie.
        </Text>
        {error && <Notice>{error}</Notice>}
        {copied !== null && (
          <Notice success={done}>
            {done
              ? `${copied} contacts copiés. Vous pouvez actualiser la preview.`
              : `${copied} contacts préparés…`}
          </Notice>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose} disabled={busy}>
          {done ? 'Fermer' : 'Annuler'}
        </Button>
        {!done && (
          <Button
            onClick={() => {
              void copy();
            }}
            disabled={busy}
          >
            {busy
              ? 'Copie en cours…'
              : error
                ? 'Reprendre la copie'
                : 'Copier et remplacer'}
          </Button>
        )}
        {done && (
          <Button
            href="https://backoffice-preview.osteopathie-animale-bordeaux.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ouvrir la preview
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
