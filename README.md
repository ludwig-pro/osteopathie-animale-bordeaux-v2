# Ostéopathie animale à Bordeaux — Agathe Lescout

Site vitrine d'Agathe Lescout, ostéopathe animalier à Bordeaux, Bègles et en
Gironde : présentation des consultations et des tarifs, réservation Calendly,
formulaire de contact et carte du cabinet.

**[Voir le site](https://www.osteopathie-animale-bordeaux.fr)** ·
**[Prendre rendez-vous](https://calendly.com/osteopathe-animalier/consultation-osteopathique)**

Le site utilise **Astro 6, React 18, TypeScript et Tailwind CSS 3**. Astro génère
un site statique dans `dist/`, hébergé sur Netlify, avec des composants React
pour les interactions.

## Liens et fournisseurs

Les consoles nécessitent un compte ayant accès au projet. Les accès génériques
sont indiqués lorsque l'identifiant du projet n'est pas documenté dans le dépôt.

| Service / fournisseur  | Rôle                                              | Liens utiles                                                                                                                                                                                                                                                                                                                 | Configuration / repère                                                                      |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Site public            | Site de production                                | [osteopathie-animale-bordeaux.fr](https://www.osteopathie-animale-bordeaux.fr)                                                                                                                                                                                                                                               | URL dans `src/lib/constants/site.ts`                                                        |
| GitHub                 | Code, pull requests et CI                         | [Dépôt](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2) · [PR](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2/pulls) · [Actions](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2/actions) · [Paramètres](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2/settings) | Branche principale : `main`                                                                 |
| Netlify                | Hébergement et Deploy Previews                    | [Déploiements](https://app.netlify.com/projects/hopeful-lumiere-46fc2e/deploys) · [Configuration](https://app.netlify.com/projects/hopeful-lumiere-46fc2e/configuration)                                                                                                                                                     | Projet `hopeful-lumiere-46fc2e` ; build `yarn build`, publication `dist/`                   |
| Netlify Forms          | Demandes de contact                               | [Formulaires du projet](https://app.netlify.com/projects/hopeful-lumiere-46fc2e/forms)                                                                                                                                                                                                                                       | Formulaire `contact`, POST vers `/`, protection par honeypot                                |
| Calendly               | Prise de rendez-vous                              | [Consultation](https://calendly.com/osteopathe-animalier/consultation-osteopathique) · [Compte](https://calendly.com/app)                                                                                                                                                                                                    | URL dans `src/components/landing-page/hero/Hero.tsx`                                        |
| Mapbox                 | Carte interactive, chargée à la demande           | [Console](https://console.mapbox.com/) · [Documentation](https://docs.mapbox.com/mapbox-gl-js/)                                                                                                                                                                                                                              | `PUBLIC_MAPBOX_TOKEN` ; style `mapbox/standard`                                             |
| Google Maps            | Itinéraire vers le cabinet et parking             | [Itinéraire](https://www.google.fr/maps/dir/?api=1&destination=44.805434%2C-0.550281&travelmode=driving) · [Parking](https://maps.app.goo.gl/bZdtom3PSSN1TjZE9)                                                                                                                                                              | Destination dans `src/lib/directions.ts`                                                    |
| Sentry                 | Erreurs navigateur et sourcemaps                  | [Console](https://sentry.io/) · [Documentation Astro](https://docs.sentry.io/platforms/javascript/guides/astro/)                                                                                                                                                                                                             | `PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`                    |
| Google Tag Manager     | Conteneur de tags et événements métier            | [Console GTM](https://tagmanager.google.com/)                                                                                                                                                                                                                                                                                | `PUBLIC_GTM_ID` ; chargement dans `src/layouts/BaseLayout.astro`                            |
| PostHog                | Analyse des parcours de réservation et de contact | [Console US](https://us.posthog.com/) · [Console EU](https://eu.posthog.com/)                                                                                                                                                                                                                                                | `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` ; région selon le projet                        |
| Google reCAPTCHA       | Configuration historique anti-spam                | [Administration](https://www.google.com/recaptcha/admin)                                                                                                                                                                                                                                                                     | `PUBLIC_RECAPTCHA_KEY` encore référencée ; le formulaire actuel utilise le honeypot Netlify |
| Facebook               | Page publique de la praticienne                   | [Agathe Lescout](https://www.facebook.com/AgatheLescout/)                                                                                                                                                                                                                                                                    | Footer et données structurées                                                               |
| Ordre des vétérinaires | Annuaire des personnes inscrites au RNA           | [Annuaire officiel](https://extranet.veterinaire.fr/annuaires/osteopathes-rna)                                                                                                                                                                                                                                               | Lien depuis la présentation de la praticienne                                               |

Le registrar du domaine et le fournisseur DNS ne sont pas documentés dans le
dépôt. Leurs accès restent à renseigner une fois les comptes identifiés.

## Développement local

Prérequis : **Node.js ≥ 22.13.0** et **Yarn 1.22.22**.

```bash
yarn install --frozen-lockfile
yarn dev
```

Ouvrir [localhost:4321](http://localhost:4321). Pour vérifier le rendu du build
de production :

```bash
yarn build
yarn preview
```

## Variables d'environnement

Configurer les valeurs locales dans un fichier `.env.local` non versionné et
les valeurs de déploiement dans la configuration Netlify. Les variables
`PUBLIC_*` sont intégrées au code navigateur lors du build.

| Variable                            | Utilisation                              | Valeur par défaut / comportement                                                   |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `PUBLIC_MAPBOX_TOKEN`               | Jeton public Mapbox                      | Nécessaire à la carte interactive                                                  |
| `PUBLIC_GTM_ID`                     | Identifiant du conteneur GTM             | Chargement activé si renseigné                                                     |
| `PUBLIC_POSTHOG_KEY`                | Clé publique du projet PostHog           | Chargement activé si renseignée                                                    |
| `PUBLIC_POSTHOG_HOST`               | Endpoint d'ingestion PostHog             | `https://us.i.posthog.com` ; utiliser `https://eu.i.posthog.com` pour un projet EU |
| `PUBLIC_ANALYTICS_GTM_DELAY_MS`     | Délai de chargement GTM après `load`     | `3000` ms                                                                          |
| `PUBLIC_ANALYTICS_POSTHOG_DELAY_MS` | Délai de chargement PostHog après `load` | `5000` ms                                                                          |
| `PUBLIC_SENTRY_DSN`                 | DSN public Sentry                        | Monitoring navigateur activé si renseigné                                          |
| `SENTRY_AUTH_TOKEN`                 | Upload des sourcemaps                    | Secret réservé au build / à la CI                                                  |
| `SENTRY_ORG`                        | Organisation Sentry                      | À renseigner avec le token et le projet pour l'upload                              |
| `SENTRY_PROJECT`                    | Projet Sentry                            | À renseigner avec le token et l'organisation pour l'upload                         |
| `PUBLIC_RECAPTCHA_KEY`              | Ancienne configuration reCAPTCHA         | Pas utilisée dans la soumission actuelle du formulaire                             |

Les variables destinées aux Deploy Previews doivent être disponibles dans ce
contexte Netlify, puis prises en compte par un nouveau build.

## Commandes et validation

| Commande                        | Usage                                                                     |
| ------------------------------- | ------------------------------------------------------------------------- |
| `yarn dev`                      | Serveur Astro avec rechargement à chaud                                   |
| `yarn build`                    | Vérification Astro puis génération du site statique                       |
| `yarn preview`                  | Prévisualisation du dernier build                                         |
| `yarn format`                   | Formatage Prettier du projet                                              |
| `yarn check:static`             | Formatage, ESLint et vérification des types de l'application et des tests |
| `yarn test:unit`                | Tests unitaires avec le runner Node.js                                    |
| `yarn test:e2e`                 | Tests Playwright Chromium sur un build local                              |
| `yarn test:e2e:netlify`         | Vérification du formulaire sur un déploiement Netlify identifié           |
| `yarn lighthouse:remote`        | Audit de l'URL définie par `LIGHTHOUSE_TARGET_URL`                        |
| `yarn ci:lighthouse:regression` | Comparaison des scores Lighthouse avec la référence CI                    |

Pour les tests E2E locaux, installer Chromium une première fois :

```bash
yarn playwright install chromium
yarn test:e2e
```

Playwright construit le site et lance le serveur de preview automatiquement
si aucun serveur compatible n'est déjà disponible sur le port 4321.

Le test Netlify nécessite `NETLIFY_FORM_TEST_DEPLOY_ID`,
`NETLIFY_FORM_TEST_COMMIT_SHA`, `NETLIFY_FORM_TEST_URL` et `NETLIFY_FORM_TEST_MARKER`, avec un SHA identique au
`HEAD` local et l'URL atomique du déploiement. Voir
[le protocole de vérification du formulaire](plans/003-netlify-form-deploy-verification.md)
avant de l'exécuter.

La CI GitHub exécute les contrôles statiques, les tests unitaires, le build et
les tests E2E. Sur les PR, le contrôle Lighthouse lit les scores du commentaire
Netlify correspondant au commit courant ; sur `main`, il audite la production.

## Organisation du projet

```text
src/
├── pages/                 # Routes Astro : accueil et page 404
├── layouts/               # HTML global, métadonnées et chargement analytics
├── components/            # Sections du site et composants React
├── lib/                   # Constantes métier, analytics et utilitaires
└── images/                # Images traitées par Astro
public/                    # Fichiers statiques
tests/
├── unit/                  # Tests unitaires
├── e2e/                   # Tests navigateur locaux
└── netlify/               # Vérification du formulaire déployé
scripts/                   # Outillage Lighthouse et tests associés
ci/                        # Scores Lighthouse de référence
plans/                     # Plans et protocoles de validation
.github/workflows/         # CI qualité et analyse CodeQL
```

Les coordonnées du cabinet, les informations de la praticienne et l'URL du
site sont centralisées dans `src/lib/constants/site.ts`. La configuration des
services publics est dans `src/lib/constants/api.ts`.

## Analytics et monitoring

GTM et PostHog sont chargés à la première interaction ou de façon différée
après `load`, avec des déclencheurs supplémentaires sur `visibilitychange`
et `pagehide`.

Événements métier :

- `calendly_*` : clics de réservation, affichage de l'événement et planification.
- `contact_section_cta_clicked` : accès à la section contact.
- `contact_phone_clicked` / `contact_email_clicked` : contact direct.
- `contact_form_submit_started` / `contact_form_submit_succeeded` /
  `contact_form_submit_failed` : suivi des soumissions du formulaire.

Sentry est configuré dans `sentry.client.config.ts` pour le navigateur.
Les hooks historiques Axeptio du footer ne suffisent pas à documenter un
fournisseur de consentement actif : vérifier le conteneur GTM et la version
déployée pour connaître la configuration effective.

## Déploiement

`netlify.toml` définit le build `yarn build`, le dossier publié `dist/`,
Node.js 22.13.0, les en-têtes de cache et la page 404. Le projet est en mode
statique, sans adaptateur Netlify dans la configuration Astro actuelle.

Chaque Deploy Preview liée à une PR est accessible depuis le commentaire du
bot Netlify. Avant de valider une livraison, vérifier la réservation Calendly,
la carte, les liens de contact et le formulaire sur mobile et ordinateur.
La réception réelle des messages se vérifie sur Netlify.

## Documentation technique

| Outil          | Documentation                                                                 |
| -------------- | ----------------------------------------------------------------------------- |
| Astro          | [Documentation](https://docs.astro.build/)                                    |
| React          | [Documentation](https://react.dev/)                                           |
| Tailwind CSS 3 | [Documentation v3](https://v3.tailwindcss.com/)                               |
| Netlify Forms  | [Configuration des formulaires](https://docs.netlify.com/manage/forms/setup/) |
| Playwright     | [Tests navigateur](https://playwright.dev/docs/intro)                         |
