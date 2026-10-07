# Backoffice — Agathe Lescout

Application privée sur **Cloudflare Workers + Static Assets**, protégée par
**Cloudflare Access avec Google uniquement**. Les deux comptes autorisés sont
`agathe.lescout.osteo@gmail.com` et `vantoursludwig@gmail.com`, fixés dans le code
et dans la politique Access. Le carnet Google reste celui d’Agathe.

Le backoffice comprend l’accueil, le compte connecté, la déconnexion et l’onglet
Contacts : recherche, filtres, édition des coordonnées Google, animaux et dernier
rendez-vous connu, listes de diffusion et affectations individuelles ou groupées.
Deux environnements hébergés sont prévus : `backoffice-preview` et `backoffice`,
avec Workers, applications Access et bases D1 distincts. La preview travaille
sur une copie des vrais contacts, modifiable sans écriture dans Gmail. Depuis
la production, « Copier en preview » remplace explicitement cette copie. Le
code de preview ne possède aucun binding Google ni secret OAuth.

Il reprend le monogramme OA, les couleurs et les polices locales du site.
L’interface React utilise les composants TypeScript **Catalyst UI Kit** fournis
dans l’archive du 7 août 2026 : SidebarLayout, Table, Dialog, Alert, Dropdown,
Listbox, formulaires et cases à cocher. Tailwind CSS 4 compile les styles ;
Headless UI gère le clavier, les fenêtres modales et le menu mobile. Les couleurs
du kit sont adaptées à la palette du cabinet. La licence du kit est conservée
dans `src/browser/ui/LICENSE.md`.
L’envoi des newsletters n’est pas encore implémenté. La connexion réelle dépend
de la configuration Cloudflare et de l’autorisation Google existante.

Google reste la source des coordonnées. Une liaison privée `GOOGLE_CONTACTS`
vise le service `GoogleContactsService` de `apps/contacts-sync` ; le backoffice
ne reçoit aucun secret OAuth Google. L’historique Calendly enrichit les fiches
déjà associées à un identifiant Google, sans transmettre les notes de consultation.
Les noms d’animaux sont modifiables dans la fiche ; les dates restent consultables.
La fiche propose un prénom, un nom, un seul e-mail et un seul téléphone. La synchronisation peut
réajouter des coordonnées conservées dans les réservations Calendly.

La base D1 de production contient les listes, leurs descriptions, les références
Google et les accords de diffusion. La base de preview contient ses propres listes
et une copie des coordonnées, des animaux et du dernier rendez-vous connu ;
elle ne stocke pas les notes de consultation ni les réservations complètes. Une affectation commence « Accord à confirmer » ; l’ajout
groupé conserve les accords et désinscriptions existants. Les listes archivées
peuvent être restaurées avec leurs affectations.

Depuis la racine du monorepo :

```sh
yarn install --frozen-lockfile
yarn workspace @osteo/backoffice run check
yarn workspace @osteo/backoffice test
yarn build:backoffice
yarn dev:backoffice
yarn preview:backoffice
yarn preview:export:backoffice
```

`build:backoffice` prépare les assets et réalise un **dry-run**, sans publication.
`dev:backoffice` écoute sur le port 8788 et conserve toutes les vérifications
d’authentification. Sans configuration Access, il retourne 503. Il n’existe
aucun contournement de l’authentification dans le Worker. Les tests utilisent
des clés de signature éphémères et des services fictifs, jamais des jetons réels.

`preview:backoffice` lance un serveur d’interface distinct sur
`http://localhost:8788`, limité à l’adresse de boucle locale. Il affiche une
session locale, sans appel à Google. Par défaut, les
contacts sont fictifs. Pour travailler avec le contenu de la preview hébergée,
lancer `yarn preview:pull:backoffice` à la racine, puis redémarrer
`yarn preview:backoffice`. Cette lecture D1 récupère le snapshot actif, les
libellés, les listes actives/archivées et les affectations de la preview.
Elle utilise la session Wrangler existante et les identifiants non secrets de
`.credentials/backoffice-preview.json`. La copie est enregistrée dans
`apps/backoffice/.credentials/local-preview-data.json`, ignoré par Git et lisible
uniquement par son propriétaire. Aucun secret Google n’est téléchargé.
Les modifications locales sont conservées dans `.credentials/local-backoffice.sqlite`
(mode 0600), même après un redémarrage. Elles ne modifient ni la preview hébergée ni Google. La récupération est explicite,
sans synchronisation automatique. Une preview vide donne un local vide.
Pour alimenter la preview depuis Google, lancer d’abord « Copier en preview »
dans le backoffice de production. L’export HTML conserve toujours les données fictives.
Le serveur recharge les sources TypeScript. Après une modification de
l’interface React ou du CSS Tailwind,
relancer `yarn workspace @osteo/backoffice assets:build` et rafraîchir la page.
Ce script n’est jamais inclus dans le Worker.

Sur ordinateur, les colonnes du carnet sont redimensionnables en glissant le
bord droit de leur en-tête. Un double-clic rétablit la largeur initiale. Les
largeurs sont mémorisées dans ce navigateur ; les poignées sont aussi utilisables
au clavier avec les flèches gauche/droite et la touche Début.

`localhost` désigne la machine sur laquelle le navigateur tourne. Un serveur
lancé dans un environnement cloud ne devient donc pas accessible depuis
ChatGPT ou un autre ordinateur par ce lien ; il faut une redirection de port
fournie par l’environnement, ou lancer cette commande sur son propre ordinateur.

`preview:export:backoffice` génère `apps/backoffice/dist/backoffice-apercu.html`.
Ce fichier autonome s’ouvre directement dans un navigateur après téléchargement,
avec ses styles, polices et icônes intégrés. Il permet de parcourir l’accueil
les contacts et les listes, modifier des coordonnées fictives et tester
les affectations sans serveur ni connexion Google. Les modifications ne sont
pas persistées et disparaissent à la réouverture. Il s’agit d’un instantané : régénérer le fichier après les
modifications. Un chemin de sortie peut être passé en argument à la commande.

Le Worker vérifie la signature RS256, l’émetteur Access, l’audience de cette
application, la durée de validité, le type de jeton et l’adresse autorisée avant
toute route, API ou ressource statique. Les réponses privées ne sont pas mises
en cache. Les adresses `admin.osteopathie-animale-bordeaux.fr` et
`admin-preview.osteopathie-animale-bordeaux.fr` sont protégées par Access.
Les URL de version sont désactivées.

[Configuration de Google SSO, Access et du domaine](../../docs/backoffice-cloudflare.md).

## Environnements hébergés

Après configuration du fournisseur Google dans Zero Trust et des accès Cloudflare,
depuis ce workspace :

```sh
yarn provision preview
yarn provision production
yarn deploy preview
# Le service Google privé doit être déployé avant la production.
yarn deploy production
```

Les identifiants sans jeton sont conservés dans `.credentials/`, ignoré par Git.
La CI publie la preview sur les pushes de la branche `preview` ; la production
se publie manuellement depuis `main`. Le build valide les deux entrypoints
sans les publier. Le [guide de mise en service](../../docs/backoffice-cloudflare.md)
détaille les variables GitHub, les droits Cloudflare, la copie des contacts et
les vérifications réelles de connexion.

## Revue des identités et animaux

La revue manuelle historique conserve ses API et son journal privé, mais aucun
bouton de revue n’est proposé dans les fiches. La normalisation des noms et
l’extraction des animaux s’exécutent automatiquement à la lecture.

Les corrections et animaux sont enregistrés atomiquement avec un historique privé.
« Annuler cette étape » restaure la version précédente uniquement si la fiche n’a
pas changé depuis. La recherche retrouve aussi le nom d’origine. Une nouvelle
copie Google est refusée dès qu’une revue existe, pour préserver le travail de test.

Les migrations 0003 et 0004 sont déployées uniquement en preview. L’API de revue
refuse la production et la preview ne possède aucun binding Google. La publication
et le parcours d’écriture Google limité aux noms sont une phase ultérieure, après
validation opérateur de cette revue. Les coordonnées restent inchangées pendant
une correction d’identité en preview.

Pour mettre le local à jour depuis une preview corrigée, arrêter le serveur puis
exécuter `yarn preview:pull:backoffice --reset-local` et relancer
`yarn preview:backoffice`. La base locale précédente est renommée en sauvegarde
privée ; sans ce flag, elle est conservée. Le fichier JSON seul ne remplace pas
une base SQLite déjà utilisée. L’export inclut les animaux et le journal de revue.

`node --experimental-strip-types apps/backoffice/scripts/review-demo.mjs` lance
un exercice fictif sur le port 8790 avec une base SQLite distincte. Aucun appel
Google et aucun accès aux données réelles n’y sont nécessaires.

### Normalisation transparente

La normalisation s’exécute côté serveur à chaque lecture/import de contacts : nom non structuré dans le nom de famille, prénom vide, parenthèses dans les animaux. Les champs prénom/nom déjà distincts restent distincts. Il n’y a aucun bouton ni traitement à lancer dans l’interface. Les nouveaux contacts suivent automatiquement la même règle, en local, preview et production.

Google reste la source des coordonnées et des noms bruts. La réponse du backoffice est normalisée sans écrire dans Google à la lecture. Les animaux extraits sont mémorisés dans `known_contact_animals`, indépendamment du nom Google, pour survivre à une édition du nom. L’export local inclut cette mémoire. Les corrections explicites avec registre d’animaux restent prioritaires. Ce mécanisme ne constitue pas une réécriture massive du carnet Google.

L’ancien endpoint de lot `/api/contact-normalization`, réservé à la preview, reste disponible pour les opérations techniques ; aucune interface utilisateur ne l’appelle.

### Tableau des contacts

Le tri se fait sur les en-têtes, avec flèche et `aria-sort`. Chaque ligne propose un menu d’édition. Les initiales des mots des noms humains et animaux sont mises en majuscule sans convertir le reste en minuscules.

`animalTypes` expose les espèces explicites des réservations (question dédiée, intitulé Calendly non ambigu, ou mot d’espèce explicite dans le champ race historique). Aucune espèce n’est déduite du prénom ou d’un dictionnaire de races. La colonne reste vide sans source. La préparation de ce flux se trouve dans contacts-sync ; cette itération est locale et ne déploie pas ce Worker. Le script opérateur `node --experimental-strip-types scripts/enrich-local-species.mjs` lit uniquement les réservations existantes et enrichit la copie SQLite locale. Sur la copie du 7 octobre : 184 contacts renseignés parmi 1 702 ; aucune écriture Google ou D1 distante.

## Édition des noms d’animaux

La fiche propose des pastilles pour les animaux, sous le téléphone. Entrée ajoute
un nom ; la croix au survol ou au focus permet de le retirer. Sur écran tactile,
la croix reste visible. Le nom en cours de saisie est inclus lors de l’enregistrement. Un seul bouton enregistre la fiche : seules les
coordonnées modifiées sont envoyées à Google, les noms d’animaux restent dans D1.
Si seule la seconde écriture échoue, le message indique ce qui reste à enregistrer. La migration 0006 ajoute `contact_animal_overrides` :
une correction remplace les noms historiques, y compris lorsqu’on retire tous les
animaux. Les anciens noms ne réapparaissent pas au rechargement ou à la lecture
suivante. Une version propre aux animaux empêche d’écraser une édition concurrente.
L’export vers le local conserve ces corrections. Cette évolution est vérifiée
en local ; la migration et le Worker doivent être publiés avant usage distant.

## Historique dans la fiche contact

L’onglet Historique remplace l’affectation aux listes dans la fiche. Il affiche les
réservations associées à l’identifiant Google, du plus récent au plus ancien,
avec date et heure de Paris, animal et statut annulé ou à venir. Les événements
portent un identifiant et un type pour accueillir ensuite d’autres interactions.
Les notes de consultation et les réponses personnelles ne sont pas exposées.
Un historique absent est distingué d’un historique chargé mais vide.

Le lecteur privé contacts-sync enrichit désormais le DTO avec ces événements.
Pour le développement, `node --experimental-strip-types scripts/enrich-local-history.mjs`
lit les réservations D1 existantes et alimente uniquement la copie SQLite locale.
Au 7 octobre 2026, 2 461 associations de réservations ont été récupérées ; les
1 702 fiches locales ont été enrichies (avec un tableau vide si aucune réservation).
Cette itération est locale : le lecteur modifié doit encore être déployé avant
une prochaine copie distante. Les données actuelles ne contiennent pas de photo ;
l’avatar à initiales a donc été retiré de la fiche.
