# Osteopathie animalière – Astro

Site vitrine d'Agathe Lescout, désormais propulsé par [Astro](https://astro.build/) avec intégrations React et Tailwind CSS.

## 🚀 Démarrage rapide

1. Installe les dépendances :
   ```bash
   yarn install
   ```
2. Lance le serveur de dev :
   ```bash
   yarn dev
   ```
   L'application est disponible sur `http://localhost:4321`.
3. Construis une version production :
   ```bash
   yarn build
   ```
4. Prévisualise le build localement :
   ```bash
   yarn preview
   ```

## 📁 Structure du projet

```
.
├── astro.config.mjs        # Configuration statique Astro + React, Tailwind et sitemap
├── public/                 # Fichiers statiques servis tels quels
├── src/
│   ├── components/         # Composants communs, landing page et layout
│   ├── images/             # Assets utilisés dans les composants
│   ├── layouts/            # Layout HTML commun et wrappers Astro
│   ├── lib/                # Métadonnées, constantes, analytics et hooks
│   └── pages/              # Routes Astro (`.astro`)
├── tests/e2e/              # Contrats Playwright et smoke tests
├── tailwind.config.js      # Configuration Tailwind (content, palette…)
├── package.json            # Scripts et dépendances
└── yarn.lock               # Généré après `yarn install`
```

## 🧰 Scripts utiles

- `yarn dev` : serveur de développement Astro (HMR).
- `yarn build` : génération statique prête pour Netlify.
- `yarn preview` : prévisualisation du build localement.
- `yarn lint` : contrôle ESLint des sources Astro, JS et TypeScript.
- `yarn test:e2e` : suite Playwright complète sur le build de production.
- `yarn test:e2e tests/e2e/seo.spec.ts` : contrat SEO statique ciblé.
- `yarn format` : formatage Prettier (`.js`, `.jsx`, `.md`, `.astro`, etc.).

## 🔎 Contrat SEO statique

Le site est généré avec `output: 'static'`, une origine de production explicite et une politique d'URL avec slash final. Le build publie `robots.txt`, `sitemap-index.xml` et ses shards. `BaseLayout.astro` impose title, description, intention d'indexation et canonical par route.

Le test `tests/e2e/seo.spec.ts` contrôle notamment la canonical, le JSON-LD, la 404 `noindex`, les landmarks, le sitemap et le contenu critique sans JavaScript. Toute future route indexable doit être ajoutée à ce contrat.

## 📈 Monitoring (Sentry)

L'intégration Sentry Astro est activée uniquement si `PUBLIC_SENTRY_DSN` est défini.

Variables d'environnement recommandées :

- `PUBLIC_SENTRY_DSN` : DSN du projet Sentry (client navigateur).
- `SENTRY_AUTH_TOKEN` : token pour upload des sourcemaps (CI/Netlify).
- `SENTRY_ORG` : slug de l'organisation Sentry.
- `SENTRY_PROJECT` : slug du projet Sentry.

Pour tester sur une Deploy Preview Netlify, vérifie que `PUBLIC_SENTRY_DSN` est bien disponible pour le contexte **Deploy Previews** (pas seulement Production), puis relance le déploiement.

## 📊 Analytics (PostHog)

L'intégration GTM/PostHog est activée uniquement si les clés correspondantes sont définies.

Variables d'environnement recommandées :

- `PUBLIC_GTM_ID` : identifiant du conteneur Google Tag Manager.
- `PUBLIC_POSTHOG_KEY` : clé projet PostHog (client navigateur).
- `PUBLIC_POSTHOG_HOST` : endpoint ingestion PostHog (`https://eu.i.posthog.com` ou `https://us.i.posthog.com`).
- `PUBLIC_ANALYTICS_GTM_DELAY_MS` : délai (ms) avant chargement différé de GTM après `load` (défaut `3000`).
- `PUBLIC_ANALYTICS_POSTHOG_DELAY_MS` : délai (ms) avant chargement différé de PostHog après `load` (défaut `5000`).

Comportement de chargement :

- Chargement immédiat si interaction utilisateur (`pointerdown`, `keydown`, `touchstart`).
- Fallback de chargement différé en idle après `load`.
- Fallback supplémentaire sur `visibilitychange/pagehide` pour limiter les pertes de tracking.

Événements métier trackés :

- `calendly_*` : parcours prise de rendez-vous (CTA, vue événement, planification).
- `contact_section_cta_clicked` : clic CTA vers la section contact.
- `contact_phone_clicked` / `contact_email_clicked` : interactions contact direct.
- `contact_form_submit_started` / `contact_form_submit_succeeded` / `contact_form_submit_failed` : funnel formulaire.

## 🌐 Déploiement

Netlify publie directement le dossier statique `dist/`; aucun adapter Astro Netlify n'est activé. Configure les variables d’environnement (Mapbox, Sentry, GTM, PostHog…) dans le dashboard Netlify avant de déployer. Une validation distante n'est recevable que si la Deploy Preview correspond au SHA exact du commit contrôlé.

## 📚 Ressources supplémentaires

- [Documentation Astro](https://docs.astro.build)
- [Intégration React](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Astro + Tailwind](https://docs.astro.build/en/guides/integrations-guide/tailwind/)
- [Intégration Sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
