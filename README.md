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

## 🌐 Déploiement

Le site cible Netlify via `@astrojs/netlify`. Configure les variables d’environnement (Mapbox, ReCAPTCHA, GTM…) dans le dashboard Netlify avant de déployer.

## 📚 Ressources supplémentaires

- [Documentation Astro](https://docs.astro.build)
- [Intégration React](https://docs.astro.build/en/guides/integrations-guide/react/)
- [Astro + Tailwind](https://docs.astro.build/en/guides/integrations-guide/tailwind/)
- [Adapter Netlify](https://docs.astro.build/en/guides/integrations-guide/netlify/)
