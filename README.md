# Ostéopathie animale à Bordeaux — Agathe Lescout

Site vitrine d'Agathe Lescout, ostéopathe animalier à Bordeaux, Bègles et en
Gironde : présentation des consultations et des tarifs, réservation Calendly,
formulaire de contact et carte du cabinet.

**[Voir le site](https://www.osteopathie-animale-bordeaux.fr)** ·
**[Prendre rendez-vous](https://calendly.com/osteopathe-animalier/consultation-osteopathique)**

Le site utilise **Astro 7, React 19, TypeScript 6 et Tailwind CSS 4**. Astro génère
un site statique dans `dist/`, hébergé sur Netlify, avec des composants React
pour les interactions. Les styles Tailwind 4 ciblent Safari 16.4+, Chrome 111+
et Firefox 128+.

## Liens et fournisseurs

Les consoles nécessitent un compte ayant accès au projet. Les accès génériques
sont indiqués lorsque l'identifiant du projet n'est pas documenté dans le dépôt.

| Service / fournisseur  | Rôle                                              | Liens utiles                                                                                                                                                                                                                                                                                                                 | Configuration / repère                                                    |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Site public            | Site de production                                | [osteopathie-animale-bordeaux.fr](https://www.osteopathie-animale-bordeaux.fr)                                                                                                                                                                                                                                               | URL dans `src/lib/constants/site.ts`                                      |
| GitHub                 | Code, pull requests et CI                         | [Dépôt](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2) · [PR](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2/pulls) · [Actions](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2/actions) · [Paramètres](https://github.com/ludwig-pro/osteopathie-animale-bordeaux-v2/settings) | Branche principale : `main`                                               |
| Netlify                | Hébergement et Deploy Previews                    | [Déploiements](https://app.netlify.com/projects/hopeful-lumiere-46fc2e/deploys) · [Configuration](https://app.netlify.com/projects/hopeful-lumiere-46fc2e/configuration)                                                                                                                                                     | Projet `hopeful-lumiere-46fc2e` ; build `yarn build`, publication `dist/` |
| Netlify Forms          | Demandes de contact                               | [Formulaires du projet](https://app.netlify.com/projects/hopeful-lumiere-46fc2e/forms)                                                                                                                                                                                                                                       | Formulaire `contact`, POST vers `/`, protection par honeypot              |
| Calendly               | Prise de rendez-vous                              | [Consultation](https://calendly.com/osteopathe-animalier/consultation-osteopathique) · [Compte](https://calendly.com/app)                                                                                                                                                                                                    | URL dans `src/components/landing-page/hero/Hero.tsx`                      |
| Mapbox                 | Carte interactive, chargée à la demande           | [Console](https://console.mapbox.com/) · [Documentation](https://docs.mapbox.com/mapbox-gl-js/)                                                                                                                                                                                                                              | `PUBLIC_MAPBOX_TOKEN` ; style `mapbox/standard`                           |
| Google Maps            | Itinéraire vers le cabinet et parking             | [Itinéraire](https://www.google.fr/maps/dir/?api=1&destination=44.805434%2C-0.550281&travelmode=driving) · [Parking](https://maps.app.goo.gl/bZdtom3PSSN1TjZE9)                                                                                                                                                              | Destination dans `src/lib/directions.ts`                                  |
| Sentry                 | Erreurs navigateur et sourcemaps                  | [Console](https://sentry.io/) · [Documentation Astro](https://docs.sentry.io/platforms/javascript/guides/astro/)                                                                                                                                                                                                             | `PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`  |
| Google Tag Manager     | Conteneur de tags et événements métier            | [Console GTM](https://tagmanager.google.com/)                                                                                                                                                                                                                                                                                | `PUBLIC_GTM_ID` ; chargement dans `src/lib/consent.ts`                    |
| PostHog                | Analyse des parcours de réservation et de contact | [Console US](https://us.posthog.com/) · [Console EU](https://eu.posthog.com/)                                                                                                                                                                                                                                                | `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST` ; région selon le projet      |
| Facebook               | Page publique de la praticienne                   | [Agathe Lescout](https://www.facebook.com/AgatheLescout/)                                                                                                                                                                                                                                                                    | Footer et données structurées                                             |
| Ordre des vétérinaires | Annuaire des personnes inscrites au RNA           | [Annuaire officiel](https://extranet.veterinaire.fr/annuaires/osteopathes-rna)                                                                                                                                                                                                                                               | Lien depuis la présentation de la praticienne                             |

Le registrar du domaine et le fournisseur DNS ne sont pas documentés dans le
dépôt. Leurs accès restent à renseigner une fois les comptes identifiés.

## Développement local

Prérequis : **Node.js 24.21.0 (LTS, voir `.nvmrc`)** et **Yarn 1.22.22**.

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

| Variable              | Utilisation                    | Valeur par défaut / comportement                                                   |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `PUBLIC_MAPBOX_TOKEN` | Jeton public Mapbox            | Nécessaire à la carte interactive                                                  |
| `PUBLIC_GTM_ID`       | Identifiant du conteneur GTM   | Chargement après accord Analytics ou Ads si renseigné                              |
| `PUBLIC_POSTHOG_KEY`  | Clé publique du projet PostHog | Chargement après accord PostHog si renseignée                                      |
| `PUBLIC_POSTHOG_HOST` | Endpoint d'ingestion PostHog   | `https://eu.i.posthog.com` ; utiliser `https://us.i.posthog.com` pour un projet US |
| `PUBLIC_SENTRY_DSN`   | DSN public Sentry              | Monitoring navigateur activé si renseigné                                          |
| `SENTRY_AUTH_TOKEN`   | Upload des sourcemaps          | Secret réservé au build / à la CI                                                  |
| `SENTRY_ORG`          | Organisation Sentry            | À renseigner avec le token et le projet pour l'upload                              |
| `SENTRY_PROJECT`      | Projet Sentry                  | À renseigner avec le token et l'organisation pour l'upload                         |

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

## Cookies et suivi

CookieConsent 3 est servi avec le site, sans compte ni abonnement. La bannière
propose Accepter, Refuser et Personnaliser. Le pied de page rouvre les préférences
avec `data-cc="show-preferencesModal"`. Les choix sont indépendants pour Google
Analytics, Google Ads et PostHog ; ils sont conservés six mois dans
`site_cookie_consent`. Les anciens choix Axeptio ne sont pas réutilisés.

Variables d'environnement :

- `PUBLIC_GTM_ID` : conteneur Google Tag Manager.
- `PUBLIC_POSTHOG_KEY` : clé publique du projet PostHog.
- `PUBLIC_POSTHOG_HOST` : ingestion PostHog, par défaut `https://eu.i.posthog.com`.

Sans choix accepté, aucun script GTM ou PostHog n'est chargé. Les délais,
interactions et sorties de page ne déclenchent plus le suivi. Les événements
antérieurs au consentement sont abandonnés. PostHog est chargé depuis le site,
sans enregistrement des sessions ni profils personnels ; les textes et
attributs des éléments sont masqués dans la capture automatique.

Le conteneur doit appliquer le contrat `window.__cookieConsentManaged` et
`window.siteConsent`, puis traiter `site_consent_update` avec les API natives de
consentement GTM. Les balises Analytics et Ads doivent avoir des contrôles de
consentement supplémentaires et des déclencheurs distincts. Axeptio ne doit plus
se charger sur les pages gérées par CookieConsent. Voir
[la configuration GTM](./config/gtm/README.md) avant publication.

Événements suivis après consentement :

- `calendly_external_link_clicked` : clic vers Calendly (ne prouve pas une réservation).
- `contact_section_cta_clicked` : clic vers la section contact.
- `contact_phone_clicked` / `contact_email_clicked` : clics de contact.
- `contact_form_submit_started` / `contact_form_submit_succeeded` / `contact_form_submit_failed` : étapes du formulaire.

Le retrait du consentement désactive PostHog et nettoie les cookies ainsi que
le stockage d'attribution Google Ads (`_gcl_ls`) et le stockage PostHog concernés.
Le retrait d'un service déjà chargé recharge la page pour arrêter ses
écouteurs ; les autres choix sont conservés. Le SDK PostHog est épinglé à
`1.435.8` : des contrôles à ses points de dispatch bloquent aussi les requêtes déjà
en file après retrait, car son API publique d'opt-out ne les abandonne pas.
Les tests réseau de retrait doivent passer avant toute mise à jour du SDK.

Validation locale : Playwright construit le site avec des clés fictives. Les
tests de consentement interceptent toutes les requêtes externes :

```sh
yarn test:e2e tests/e2e/analytics-consent.spec.ts --workers=1 --retries=0
```

Si un serveur occupe déjà le port 4321, utiliser un build avec
`PUBLIC_GTM_ID=GTM-TESTCONSENT` et `PUBLIC_POSTHOG_KEY=phc_test_consent`, ou arrêter
ce serveur pour laisser Playwright construire son aperçu. Ces tests valident le
site avec des réponses simulées. La PR 22 a également été vérifiée sur Netlify
avec le brouillon GTM chargé via son environnement de preview : états de
consentement, requêtes Analytics / Ads, choix indépendants et retrait. Les
collecteurs étaient bloqués pendant ce test pour ne pas créer de fausses
conversions ; la réception dans les consoles n'est donc pas établie.

Sentry est configuré dans `sentry.client.config.ts` pour le navigateur.

## Déploiement

`netlify.toml` définit le build `yarn build`, le dossier publié `dist/`,
Node.js 24.21.0, les en-têtes de cache et la page 404. Le projet est en mode
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
| Tailwind CSS 4 | [Documentation](https://tailwindcss.com/docs/)                                |
| Netlify Forms  | [Configuration des formulaires](https://docs.netlify.com/manage/forms/setup/) |
| Playwright     | [Tests navigateur](https://playwright.dev/docs/intro)                         |
