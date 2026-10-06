# Backoffice — Agathe Lescout

Application privée sur **Cloudflare Workers + Static Assets**, protégée par
**Cloudflare Access avec Google uniquement**. L’unique compte autorisé est
`agathe.lescout.osteo@gmail.com`, fixé dans le code et dans la politique Access.

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
Les noms d’animaux et les dates sont consultables ; les modifications portent
sur le prénom, le nom, les e-mails et les téléphones. La synchronisation peut
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
session de démonstration signalée dans la page, sans API Google ni données de
contacts. Il sert à recueillir les retours visuels avant la mise en service du
SSO. Les contacts, rendez-vous, listes et accords sont fictifs ; leurs
modifications restent dans la mémoire du serveur de démonstration.
Le serveur recharge les sources TypeScript. Après une modification de
l’interface React ou du CSS Tailwind,
relancer `yarn workspace @osteo/backoffice assets:build` et rafraîchir la page.
Ce script n’est jamais inclus dans le Worker.

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
en cache. Les URL `workers.dev` et de prévisualisation sont désactivées.

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
