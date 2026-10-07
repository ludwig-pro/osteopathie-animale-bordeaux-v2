import type { Identity } from './auth.ts';

const escapeAttribute = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll("'", '&#39;');

export function renderFrame(
  identity: Identity,
  page: 'home' | 'contacts',
  preview = false,
  hostedPreview = false,
  localPreviewCopy = false
): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${page === 'contacts' ? 'Contacts' : 'Espace de gestion'} — Agathe Lescout</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preload" href="/assets/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/assets/fonts/lora.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="stylesheet" href="/assets/backoffice.css" />
    <script defer src="/assets/backoffice.js"></script>
  </head>
  <body>
    <div id="backoffice-root" data-page="${page}" data-email="${escapeAttribute(identity.email)}" data-name="${escapeAttribute(identity.name)}" data-preview="${preview}" data-hosted-preview="${hostedPreview}" data-local-preview-copy="${localPreviewCopy}">
      <main id="main" class="mx-auto max-w-2xl px-6 py-16"><h1 class="font-display text-3xl">${page === 'contacts' ? 'Contacts' : 'Bonjour Agathe.'}</h1><p class="mt-4 text-zinc-500">Chargement de votre espace de gestion…</p><noscript><p class="mt-4">Activez JavaScript pour consulter vos contacts et vos listes.</p></noscript></main>
    </div>
  </body>
</html>`;
}

export const renderHome = (identity: Identity, hostedPreview = false) =>
  renderFrame(identity, 'home', false, hostedPreview);
export const renderContacts = (identity: Identity, hostedPreview = false) =>
  renderFrame(identity, 'contacts', false, hostedPreview);

export function renderError(status: number): string {
  const title =
    status === 503
      ? 'Espace momentanément indisponible'
      : status === 401
        ? 'Connexion nécessaire'
        : status === 403
          ? 'Accès réservé'
          : 'Page introuvable';
  const message =
    status === 503
      ? 'Veuillez réessayer dans quelques instants.'
      : status === 404
        ? 'Cette page n’existe pas dans votre espace.'
        : 'Cet espace est réservé au compte Google d’Agathe Lescout.';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title} — Agathe Lescout</title></head><body><main><h1>${title}</h1><p>${message}</p><a href="https://www.osteopathie-animale-bordeaux.fr">Revenir au site d’Agathe Lescout</a></main></body></html>`;
}
