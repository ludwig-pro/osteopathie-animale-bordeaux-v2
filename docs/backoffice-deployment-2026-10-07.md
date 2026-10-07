# Déploiement du 7 octobre 2026

Base de travail : `main` rebasée sur `85a886e`, puis adaptations locales sur
`codex/backoffice-deploy-two-users` pour les deux comptes et les domaines workers.dev.

| Environnement | URL                                                    | Version Worker                       |
| ------------- | ------------------------------------------------------ | ------------------------------------ |
| Preview       | https://osteo-backoffice-preview.lvantours.workers.dev | b2a38309-6c75-48fa-ad81-6c5e81d071eb |
| Production    | https://osteo-backoffice.lvantours.workers.dev         | 1f166049-af7c-4ac9-85be-457d4dfc234c |

Les applications Access utilisent uniquement Google, la politique « Ostéo — Agathe
et Ludwig — Google », les deux adresses exactes Agathe et Ludwig définies dans
`src/config.ts`, et des sessions de 8 h. Les audiences sont distinctes. Configuration
vérifiée dans la console Cloudflare avec autorisation de l’opérateur. Le jeton API
Access n’étant pas disponible localement, ce premier déploiement utilise Wrangler
OAuth après vérification manuelle ; le contrôle automatique `access:check` demeure
inchangé et reste requis par le script et la CI.

Deux bases D1 distinctes ont été créées en juridiction UE. Les deux migrations du
backoffice sont appliquées. La preview ne possède aucun binding Google. La production
possède le binding privé `GoogleContactsService` et le binding de copie vers la
base preview.

Le Worker `osteo-contacts-sync` a été publié en version
`212300e0-061d-448d-8696-4266ff8fa885` pour exposer son service privé. Aucune migration
supplémentaire n’était nécessaire. Son mode existant `live` est conservé ; après
publication, aucune dernière erreur, aucun scan actif et aucun bail actif. Aucun
import ni modification manuelle de contact déclenché.

## Copie en preview et local

Après accord explicite de l’opérateur, 1 702 contacts Google et 4 libellés ont
été copiés en preview via la production authentifiée avec Ludwig. La preview
ne contient encore aucune liste de diffusion. Tous les contacts renvoyés par
l’API de preview ont été comparés à la copie locale : contenu identique.
Le serveur sur `http://localhost:8788/#contacts` charge cette copie privée,
ignorée par Git, sans credential Google. Les modifications locales restent
en mémoire et disparaissent au redémarrage.

La configuration privée du sync utilisait encore `src/index.ts`, contrairement
au fichier versionné utilisant `src/worker.ts`. Le service privé n’était donc
pas exposé par le premier déploiement. La configuration a été corrigée et le
Worker publié en version `f3dcd2fe-3c72-47bd-b466-7045ee1b5de0` ; la lecture
Google et la copie ont ensuite réussi. Le mode live existant reste inchangé.

Le contrôle d’origine de la preview utilisait aussi un ancien domaine figé.
Il accepte maintenant le domaine preview workers.dev actuel et le domaine
officiel préparé, en conservant les vérifications Access et l’absence de binding
Google. Publication de la preview : `16b23387-9602-4875-b795-6c05aac523bb`.
La preview authentifiée affiche bien les 1 702 contacts. Aucun contact Google
n’a été modifié par l’opération de copie.

Pour récupérer à nouveau le contenu hébergé : `yarn preview:pull:backoffice`,
puis redémarrer `yarn preview:backoffice`. Cette récupération ne lance pas
une nouvelle lecture Google. Les tests de cette adaptation utilisent uniquement
des données fictives ; contrôles statiques, 42 tests backoffice, 54 tests sync
et builds réussis.
Les contrôles racine `check:static`, `test:unit` et les 42 tests E2E du site
ont également réussi (serveur E2E isolé sur 4329).

## Vérifications

- Contrôles statiques, tests unitaires site (26), backoffice (39) et sync (54) réussis.
- Builds des Workers et dry-runs avec les configurations réelles réussis.
- Tests E2E du site : 42 réussis sur le port isolé 4329. Les premières tentatives
  sur 4321 avaient rencontré le serveur d’un autre projet ; elles ne valident pas
  ce dépôt.
- Sur les deux domaines, `/`, `/api/session`, `/api/contacts` et
  `/assets/backoffice.css` renvoient vers Access (302), y compris avec un faux JWT.
- Le parcours navigateur preview affiche Google puis, après sélection de Ludwig,
  Dia bloque localement le retour avec `ERR_BLOCKED_BY_CLIENT`. La vérification
  de l’écran connecté reste à terminer après intervention de l’utilisateur.
- SSO des deux comptes déjà validé au niveau du fournisseur Google ; cela ne
  remplace pas une vérification de l’application déployée.

Le site public Netlify et le DNS OVH sont inchangés. Les changements de code ne
sont pas encore commités/poussés. La CI de déploiement nécessite toujours ses
variables d’environnement et son secret API Access.

## Migration DNS vers Cloudflare

L’opérateur a autorisé la gestion DNS du domaine sur Cloudflare. La zone
`df9362d710e50ed142e85d793823195f` est préparée sur le forfait gratuit. Après lecture
des 20 entrées OVH et des 3 entrées Netlify, les MX, SPF, SRV et alias de messagerie
OVH ont été recopiés, ainsi que la vérification Google. Le site public utilise
l’apex A `75.2.60.5` et `www` CNAME `hopeful-lumiere-46fc2e.netlify.app`, sans proxy.
Les trois TXT techniques de redirection OVH ne sont pas recopiés : Netlify assure
les redirections, et les TXT sur www seraient incompatibles avec son CNAME.

Après confirmation de l’opérateur, les trois A temporaires du scan Cloudflare ont
été supprimés. Quatorze contrôles DNS sur chacun des deux nouveaux serveurs ont
réussi. OVH a accepté la délégation à `marlowe.ns.cloudflare.com` et
`owen.ns.cloudflare.com` ; l’interface affiche leur activation en cours et le
retrait des six anciens serveurs OVH/NS1. DNSSEC était déjà désactivé.

**À terminer après propagation** : Cloudflare attend encore la délégation au
registre. Le code et la CI sont préparés pour
`admin-preview.osteopathie-animale-bordeaux.fr` et
`admin.osteopathie-animale-bordeaux.fr`, avec domaines personnalisés et désactivation
de workers.dev. Les 39 tests, le contrôle du backoffice et les builds passent.
Ces modifications ne sont pas encore déployées. Les applications Access et les
Workers déployés restent sur leurs adresses workers.dev jusqu’à l’activation de la
zone. Adapter ensuite les destinations Access en conservant politiques et
audiences, configurer/déployer preview puis production, et vérifier HTTPS/SSO.
