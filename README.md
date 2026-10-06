# Ostéopathie animale — monorepo

Trois applications déployées indépendamment :

- `apps/website/` : site Astro, publié sur Netlify. [Documentation du site](apps/website/README.md).
- `apps/contacts-sync/` : Worker Calendly → Google Contacts, D1, tests et outils privés. [Installation et exploitation](docs/calendly-google-contacts.md).
- `apps/backoffice/` : espace privé Cloudflare Workers, connexion Google via Access réservée à Agathe. [Première mise en service](docs/backoffice-cloudflare.md).

## Développement

Utiliser la version Node de `.nvmrc` et Yarn 1.22.22.

```sh
yarn install --frozen-lockfile
yarn dev
yarn run check
yarn test
yarn build
yarn dev:sync
yarn build:sync
yarn dev:backoffice
yarn preview:backoffice
yarn preview:export:backoffice
yarn build:backoffice
```

Une seule installation et un seul `yarn.lock`. Chaque application déclare ses propres dépendances et possède ses configurations et tests. Les commandes historiques du site restent disponibles à la racine.

Copier `apps/website/env.example` vers `apps/website/.env` pour la configuration locale du site. Les fichiers `.env` existants d’un ancien checkout restent à déplacer manuellement ; ils ne sont ni lus ni déplacés par la migration.

## Livraison

Netlify installe depuis la racine, exécute `yarn workspace @osteo/website build` et publie `apps/website/dist`. Conserver le projet Netlify et ses variables existants, avec le répertoire de base à la racine. `netlify.toml` reste à la racine pour conserver les en-têtes et redirections.

La CI vérifie le site, Playwright et Lighthouse, ainsi que les Workers avec des données fictives. Les workflows Cloudflare sont manuels et utilisent des environnements staging/production distincts ; les secrets des services restent dans Cloudflare. Le site conserve son déploiement Netlify indépendant. Le backoffice ne peut être mis en service qu’après configuration et vérification de sa politique Access Google.

Les plans historiques sous `plans/` décrivent les chemins avant la migration : leurs chemins site sont désormais relatifs à `apps/website/`.

Avec Yarn 1, `check` est aussi une commande native : utiliser `yarn run check` pour lancer les contrôles du monorepo.

Sharp est aligné sur `0.35.4` via `resolutions`, version commune acceptée par Astro et exigée par Miniflare. Cela évite que Yarn 1 sépare deux versions du module natif et de libvips lors d’une installation neuve. Réévaluer cet alignement lors des mises à jour de Wrangler/Astro.
