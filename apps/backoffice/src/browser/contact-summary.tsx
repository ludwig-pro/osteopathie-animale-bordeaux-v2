import { useEffect, useState } from 'react';
import type { ContactSummaryView } from '../summary-types';
import type { ContactsModel } from './contacts-model';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});
const messages: Record<ContactSummaryView['state'], string> = {
  unavailable: 'La synthèse sera disponible après sa mise en service.',
  not_generated: 'Aucune synthèse disponible pour cette fiche.',
  pending: 'Actualisation en attente.',
  review: 'La synthèse attend la vérification des informations disponibles.',
  insufficient: 'Informations insuffisantes pour rédiger une synthèse.',
  error: 'La synthèse n’a pas pu être mise à jour.',
  ready: '',
  deleted: 'Cette fiche a été supprimée de Google Contacts.',
};

export function ContactSummary({
  id,
  model,
}: {
  id: string;
  model: ContactsModel;
}) {
  const [data, setData] = useState<ContactSummaryView | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const result = await model.summary(id, controller.signal);
        if (controller.signal.aborted) return;
        setData(result);
        setError('');
        if (result.state === 'pending' && !result.generationPaused)
          timer = setTimeout(() => void load(), 10000);
      } catch {
        if (!controller.signal.aborted)
          setError(
            'Impossible de charger la synthèse. Réessayez dans quelques instants.'
          );
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, model.summary, revision]);

  return (
    <section
      aria-label="Synthèse client"
      className="mb-6 rounded-xl border border-emerald-900/10 bg-emerald-50/40 p-4"
    >
      <h3 className="text-sm font-semibold text-zinc-900">Synthèse client</h3>
      {!data && !error && (
        <p role="status" className="mt-2 text-sm text-zinc-500">
          Chargement de la synthèse…
        </p>
      )}
      {data?.summary && (
        <p className="mt-3 text-sm leading-6 text-zinc-700">
          {data.summary.sentences.map((sentence) => sentence.text).join(' ')}
        </p>
      )}
      {data && messages[data.state] && (
        <p role="status" className="mt-2 text-sm text-zinc-600">
          {messages[data.state]}
        </p>
      )}
      {data?.stale && (
        <p className="mt-2 text-sm text-amber-800">
          La synthèse affichée correspond aux sources d’une génération
          précédente.
        </p>
      )}
      {data?.generationPaused &&
        data.state !== 'unavailable' &&
        data.state !== 'deleted' && (
          <p className="mt-2 text-sm text-zinc-500">
            La génération automatique est en pause.
          </p>
        )}
      {data?.generatedAt && (
        <p className="mt-2 text-xs text-zinc-500">
          {data.model === 'demo'
            ? 'Exemple fictif présenté'
            : 'Synthèse générée avec Luna'}{' '}
          le {dateFormat.format(new Date(data.generatedAt))}.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}{' '}
          <button
            className="underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Réessayer
          </button>
        </p>
      )}
    </section>
  );
}
