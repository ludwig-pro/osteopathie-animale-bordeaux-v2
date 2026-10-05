# Système de design — Agathe Lescout

La refonte conserve les photographies et les textes du site. La direction finale est professionnelle et photographique, sans illustrations : vert forêt, sauge, crème, typographie Lora pour les titres et DM Sans pour l’interface. Les polices sont hébergées avec le site.

## Fondations

`src/styles/global.css` définit les tokens sémantiques compatibles shadcn/ui (`background`, `foreground`, `primary`, `secondary`, `border`, `input`, `ring`), les espacements des sections, les grilles et les adaptations responsive. Les composants consomment ces tokens, plutôt que de définir chacun leur palette.

`components.json` configure shadcn/ui pour React, Tailwind 4 et l’alias `@/`. Les primitives locales dans `src/components/ui` suivent la composition shadcn/ui : Radix pour le comportement accessible, `class-variance-authority` pour les variantes du bouton, `cn()` pour composer les classes.

- `Button` : variantes `default`, `accent`, `outline`, `secondary`, `ghost`, `link` ; tailles `sm`, `default`, `lg`, `icon` ; `asChild` pour les liens. `BookingLink` transmet la variante au bouton partagé.
- `Card` / `CardContent` : cartes de tarifs.
- `Tabs` : changement du lieu de consultation, navigation au clavier.
- `Accordion` : étapes de consultation, contrôles accessibles, ouverture en 250 ms et fermeture en 200 ms avec animation de hauteur et d’opacité. Les animations et la rotation du pictogramme sont désactivées avec `prefers-reduced-motion`.
- `Sheet` : menu mobile avec gestion du focus, fermeture par Échap et clic extérieur.
- `DropdownMenu` : navigation desktop entre les animaux.
- `Input` / `Textarea` : champs avec labels visibles et états d’erreur.

## Composition

`BaseLayout.astro` fournit les métadonnées, le consentement, le lien d’évitement, le header et le footer. `SectionHeading`, `BookingLink` et `AnimalsSection` sont partagés entre les pages. Les sections statiques restent sans hydratation ; seuls les menus, rendez-vous suivis, tarifs, accordéons, carte et formulaire utilisent des îlots React.

`BrandMark` affiche le monogramme « OA » (Ostéopathie Animale) dans l’en-tête et le pied de page. Les liens Calendly passent par `BookingLink` et indiquent visiblement « en cabinet » avant la redirection ; le libellé du hero reprend cette précision.

Le hero de l’accueil associe une photographie pleine largeur, un fond vert profond et un grand titre en Lora. Ses tokens de surface, d’accent et de focus sont limités à `.hero` : le bouton de rendez-vous utilise la variante `accent` avec des angles légèrement arrondis. Les autres sections et les pages animaux conservent la palette, les cartes et les boutons arrondis de la V1. Le cadrage et les dégradés s’adaptent au mobile ; le bandeau inférieur renvoie vers les quatre animaux.

Les quatre routes sont générées à la compilation par `src/pages/animaux/[animal].astro` et utilisent toutes `AnimalPage.astro` :

- `/animaux/chien/`
- `/animaux/chat/`
- `/animaux/cheval/`
- `/animaux/nac/`

Chaque page possède un titre, une description, une URL canonique et des données structurées propres. La navigation utilise des liens HTML, sans routeur client. Le sitemap et robots.txt sont générés avec les routes publiques.

## Contenus

`src/lib/content/animals.ts` conserve les textes d’origine par espèce ; le texte bovin reste accessible sur l’accueil et dans la section partagée. `animal-pages.ts` associe les quatre pages aux photos, intitulés et tarifs. `copy.ts` conserve la présentation, l’ostéopathie et les étapes de consultation. `pricing.ts` est la source commune des tarifs sur l’accueil et les pages animaux.

Les textes métier et les montants ne sont pas réécrits dans cette refonte. Les nouveaux intitulés servent uniquement à la navigation et à la hiérarchie visuelle.

## Vérification

Lancer `yarn check:static`, `yarn test:unit` et `yarn test:e2e`. Les tests couvrent aussi les accès directs aux nouvelles pages, les canoniques, la conservation des textes, les liens entre pages, le menu mobile, le clavier, les images responsive et la navigation sans JavaScript.

La prise de rendez-vous conserve le lien Calendly existant. Le formulaire conserve Netlify Forms et ses validations ; la soumission locale est testée avec des réponses simulées, sans envoyer de message réel. La carte affiche d’abord un aperçu du fond Mapbox Streets, avec un repère OA et une étiquette « Le cabinet ». Les couleurs et le contraste du fond sont conservés sans filtre pour distinguer les rues, leurs noms, les bâtiments et les espaces verts. `StaticMap` et `InteractiveMap` partagent les tuiles, le zoom et le calcul du cadrage dans `src/lib/map.ts`. Leaflet et sa feuille de styles se chargent au survol avec une souris, au clic ou au clavier. L’aperçu entier est une surface d’activation transparente et accessible ; aucun bouton de chargement n’est affiché sur la carte. Entrée et Espace l’activent au clavier, puis le focus est transféré à la carte interactive. La carte interactive apparaît en fondu seulement après le chargement complet des tuiles ; l’aperçu reste visible en cas d’erreur. Sur mobile, le défilement n’active pas la carte. Les attributions et le logo Mapbox restent visibles. Le fond Mapbox utilise la variable existante `PUBLIC_MAPBOX_TOKEN` ; sans cette configuration, le fond OpenStreetMap standard sert de repli. Les tuiles Mapbox de 512 px en haute définition sont partagées entre l’aperçu et la carte interactive. Les contrôles de zoom arrondis reprennent les couleurs du site et leurs intitulés sont en français. Le zoom à la molette est désactivé pour préserver le défilement de la page.

### Lisibilité

Échelle partagée en rem : texte courant 18 px, interfaces 16 px, indications secondaires 14 px et légendes 13 px (base navigateur 16 px). Les textes mobiles conservent cette échelle. Le menu compact prend le relais sous 1200 px pour laisser respirer la navigation.
