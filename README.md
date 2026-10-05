# Ostéopathie animale — monorepo

Deux applications déployées indépendamment :

- `apps/website/` : site Astro, publié sur Netlify. [Documentation du site](apps/website/README.md).
- `apps/contacts-sync/` : emplacement prévu pour le Worker Calendly → Google Contacts.

## Développement

Utiliser la version Node de `.nvmrc` et Yarn 1.22.22.

```sh
yarn install --frozen-lockfile
yarn dev
yarn run check
yarn test
yarn build
```

Une seule installation et un seul `yarn.lock`. Chaque application déclare ses propres dépendances et possède ses configurations et tests. Les commandes historiques du site restent disponibles à la racine.

Copier `apps/website/env.example` vers `apps/website/.env` pour la configuration locale du site. Les fichiers `.env` existants d’un ancien checkout restent à déplacer manuellement ; ils ne sont ni lus ni déplacés par la migration.

## Livraison

Netlify installe depuis la racine, exécute `yarn workspace @osteo/website build` et publie `apps/website/dist`. Conserver le projet Netlify et ses variables existants, avec le répertoire de base à la racine. `netlify.toml` reste à la racine pour conserver les en-têtes et redirections.

La CI vérifie le site, Playwright et Lighthouse. Les ressources Cloudflare et secrets de synchronisation seront distincts de ceux du site.

Les plans historiques sous `plans/` décrivent les chemins avant la migration : leurs chemins site sont désormais relatifs à `apps/website/`.

Avec Yarn 1, `check` est aussi une commande native : utiliser `yarn run check` pour lancer les contrôles du monorepo.
