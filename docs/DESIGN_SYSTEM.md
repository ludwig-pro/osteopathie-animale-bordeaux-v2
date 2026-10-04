# V3 — Bien bouger. Bien vivre.

La V3 est une proposition indépendante : identité prune, abricot et ivoire, typographie Manrope pour les titres et DM Sans pour la lecture, photos de soins et formes arrondies. Le contenu est réécrit pour répondre aux questions d’un propriétaire avant une consultation. Les informations de la pratique — identité, qualifications, coordonnées, lieux et montants — proviennent du site existant.

La V2 reste dans la PR #27, sur `design/editorial-motion-preview`. La V3 vit sur `design/movement-care-v3` et dispose de sa propre preview. Ce sont des propositions alternatives, sans fusion en production.

## Parcours

L’accueil présente la proposition d’accompagnement, les animaux concernés, les motifs de prise de contact, l’approche, la praticienne, le déroulement, les tarifs, les lieux de consultation, les questions fréquentes et le contact. Les quatre pages animales gardent des URL propres et développent leurs informations avec un modèle commun.

La FAQ utilise des éléments `details` natifs : elle fonctionne au clavier et sans JavaScript. Sur mobile, une barre de contact apparaît après l’introduction et se masque à l’approche du formulaire. Elle propose le téléphone et le lien Calendly existants, sans recouvrir le formulaire.

## Fondations et composants

Les tokens sémantiques dans `src/styles/global.css` définissent les couleurs, rayons, espacements, tailles et transitions. Corps de texte à 18 px, interfaces principales à 16 px. Les polices sont auto-hébergées. Les styles du consentement, le favicon et la couleur du navigateur suivent la nouvelle identité.

Les primitives `Button`, `Card`, `Tabs`, `Accordion`, `Sheet`, `Input` et `DropdownMenu` restent composables avec Radix et les conventions shadcn/ui. `BookingLink` centralise le rendez-vous et son suivi analytique. `SectionHeading`, `AnimalsSection`, `Faq` et `AnimalPage` portent les compositions partagées.

Les sections statiques restent rendues par Astro. Les menus, formulaire, tarifs et étapes de séance utilisent des îlots React. La carte Mapbox reste chargée uniquement sur demande. Les images ont des tailles responsive adaptées aux nouvelles grilles.

## Contenus

- `src/lib/content/animal-pages.ts` : les espèces, photos et textes de leurs pages.
- `src/lib/content/copy.ts` : déroulement et questions fréquentes.
- `src/lib/content/pricing.ts` : tarifs existants, partagés entre accueil et pages animaux.
- `src/lib/constants/site.ts` : informations de la pratique.

Le discours présente l’ostéopathie comme un accompagnement complémentaire au vétérinaire. Aucune statistique de résultats, aucun avis client et aucune garantie d’efficacité n’ont été ajoutés.

## Mouvement et accessibilité

Les révélations au défilement sont une amélioration progressive via IntersectionObserver et Web Animations. Les contenus restent visibles sans JavaScript. Les survols, accordéons et menu ont des transitions courtes ; `prefers-reduced-motion` désactive les mouvements et annule les animations en cours si la préférence change.

Le raccourci mobile utilise un observateur indépendant pour rester fonctionnel même en mode de réduction des animations. Les états de focus, libellés de champs, erreurs et interactions au clavier sont conservés.

## Validation

`yarn build`, `yarn check:static`, `yarn test:unit` et `yarn test:e2e` sont les vérifications du projet. Les scénarios de la V3 couvrent aussi la FAQ sans JavaScript et au clavier, la disponibilité du raccourci mobile, son positionnement et son masquage devant le formulaire. Voir `design-qa.md` pour les résultats et captures.
