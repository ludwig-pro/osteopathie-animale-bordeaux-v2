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

Le site cible Netlify via `@astrojs/netlify`. Configure les variables d’environnement (Mapbox, ReCAPTCHA, GTM…) dans le dashboard Netlify avant de déployer.

## 📚 Ressources supplémentaires

- [Documentation Astro](https://docs.astro.build)
- [Intégration React](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Astro + Tailwind](https://docs.astro.build/en/guides/integrations-guide/tailwind/)
- [Adapter Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/)
