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
├── astro.config.mjs        # Configuration Astro + intégrations (React, Tailwind, Netlify)
├── public/                 # Fichiers statiques servis tels quels
├── src/
│   ├── components/         # Composants React réutilisables
│   │   ├── pages/Home.jsx  # Composition de la page d'accueil
│   │   └── layout.css      # Styles globaux (Tailwind)
│   ├── hooks/              # Hooks côté navigateur
│   ├── images/             # Assets utilisés dans les composants
│   └── pages/              # Routes Astro (`.astro`)
├── tailwind.config.js      # Configuration Tailwind (content, palette…)
├── package.json            # Scripts et dépendances
└── yarn.lock               # Généré après `yarn install`
```

## 🧰 Scripts utiles

- `yarn dev` : serveur de développement Astro (HMR).
- `yarn build` : génération statique prête pour Netlify.
- `yarn preview` : prévisualisation du build localement.
- `yarn format` : formatage Prettier (`.js`, `.jsx`, `.md`, `.astro`, etc.).

## 📈 Monitoring (Sentry)

L'intégration Sentry Astro est activée uniquement si `PUBLIC_SENTRY_DSN` est défini.

Variables d'environnement recommandées :

- `PUBLIC_SENTRY_DSN` : DSN du projet Sentry (client navigateur).
- `SENTRY_AUTH_TOKEN` : token pour upload des sourcemaps (CI/Netlify).
- `SENTRY_ORG` : slug de l'organisation Sentry.
- `SENTRY_PROJECT` : slug du projet Sentry.

Pour tester sur une Deploy Preview Netlify, vérifie que `PUBLIC_SENTRY_DSN` est bien disponible pour le contexte **Deploy Previews** (pas seulement Production), puis relance le déploiement.

## 📊 Cookies et suivi

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

Le retrait du consentement désactive PostHog et nettoie les cookies concernés.
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
site avec des réponses simulées ;
une prévisualisation Tag Assistant du conteneur importé reste nécessaire avant
la mise en production.

## 🌐 Déploiement

Le site cible Netlify via `@astrojs/netlify`. Configure les variables d’environnement (Mapbox, ReCAPTCHA, GTM…) dans le dashboard Netlify avant de déployer.

## 📚 Ressources supplémentaires

- [Documentation Astro](https://docs.astro.build)
- [Intégration React](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Astro + Tailwind](https://docs.astro.build/en/guides/integrations-guide/tailwind/)
- [Adapter Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/)
