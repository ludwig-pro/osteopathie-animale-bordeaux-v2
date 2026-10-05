# Vérification de la refonte

Date : 5 octobre 2026.

final result: passed

## Direction vérifiée

Refonte professionnelle en vert forêt, sauge et crème, fondée sur les photos existantes. La V1 conserve ses sections, ses pages animaux et son échelle de textes agrandie. Le hero reprend la composition de la V2 : photo pleine largeur, fond vert profond, grand titre Lora, accent vert clair et bandeau inférieur.

## Rendu et navigation

Les cinq pages ont été ouvertes avec Chromium sur ordinateur et mobile. Le hero a aussi été contrôlé à 320, 390, 768, 1024, 1440 et 1576 px, avec ses liens vers les animaux et le contact. L’espacement du sous-titre de la marque est réduit sous 360 px pour que le menu reste dans l’écran. Les captures du hero, de l’en-tête et de la consultation ont été actualisées sur le build de production, après chargement des polices et des images. Les captures complètes de l’accueil ci-dessous datent du 4 octobre, avant les corrections du logo et de la carte. Les états du menu, des tarifs et des étapes de consultation sont vérifiés par les tests.

Captures :

- [Accueil desktop](docs/screenshots/redesign/home-desktop.jpg)
- [Accueil mobile](docs/screenshots/redesign/home-mobile.jpg)
- [Hero desktop](docs/screenshots/redesign/hero-desktop.png)
- [Hero mobile](docs/screenshots/redesign/hero-mobile.png)
- [Page chien desktop](docs/screenshots/redesign/dog-desktop.jpg)
- [Page chien mobile](docs/screenshots/redesign/dog-mobile.jpg)

## Contrôles

- `yarn build` : réussi, quatre routes animales générées et accueil statique.
- `yarn check:static` : réussi ; aucun avertissement ni erreur de typage. Une suggestion préexistante de TypeScript concerne l’import CookieConsent.
- `yarn test:unit` : 26 cas réussis dans 2 fichiers.
- `yarn test:e2e` : 42 tests réussis, avec Chromium système et une configuration locale adaptée à l’environnement.
- Menu mobile et navigation sans JavaScript : 2 tests revérifiés sur le build de production après l’ajustement à 320 px.
- Textes des quatre animaux : comparés intégralement aux textes d’origine après normalisation des espaces.
- Images : choix du plus petit format adéquat contrôlé à 375, 768, 1024, 1280 et 1440 px.
- Navigation : accès direct, rechargement, retour navigateur, liens entre pages, ancres depuis une autre page et menu mobile.
- Accessibilité fonctionnelle : focus du formulaire, Échap et retour du focus dans le menu, clavier sur les onglets, accordéons, liens d’évitement et un seul titre H1 par page.
- Consentement : refus, préférences, chargement conditionnel des services conservés.
- Carte : fond Mapbox Light configuré par `PUBLIC_MAPBOX_TOKEN`, repli OpenStreetMap désaturé, code et styles Leaflet chargés au survol ou après activation explicite.
- Lighthouse mobile, accueil avec le nouveau hero, mesure locale unique : performance 93, accessibilité 100, bonnes pratiques 100, SEO 100.

## Retours sur la preview — 5 octobre

- Monogramme « OA » partagé entre l’en-tête et le pied de page.
- Mention « en cabinet » sur chaque lien Calendly, sur l’accueil, dans le menu mobile et sur les quatre pages animaux.
- Accordéons : transitions de hauteur et d’opacité à l’ouverture et à la fermeture, rotation du pictogramme, navigation au clavier et respect du mode mouvement réduit.
- Carte : aperçu statique réel, même cadrage et repère que la carte interactive, fondu après chargement complet, clic sur la surface, activation au survol avec une souris et au clavier, repli si la feuille de styles échoue, mode mouvement réduit et toucher sur mobile. Les positions des tuiles et du repère sont comparées à un pixel près.
- Accordéons contrôlés à 390 et 1456 px, avec et sans mouvement réduit : mesures de hauteur et d’opacité pendant les deux transitions, puis réouverture au clavier.
- Logo et libellés Calendly vérifiés à 320, 390, 768, 1024, 1116, 1200, 1440 et 1576 px, et sur les quatre pages animaux à 390 et 1440 px.
- Captures des corrections : [En-tête desktop](docs/screenshots/feedback/header-desktop.png), [En-tête mobile](docs/screenshots/feedback/header-mobile.png), [Pied de page desktop](docs/screenshots/feedback/footer-desktop.png), [Pied de page mobile](docs/screenshots/feedback/footer-mobile.png), [Consultation desktop](docs/screenshots/feedback/consultation-desktop.png), [Consultation mobile](docs/screenshots/feedback/consultation-mobile.png).
- `check:static`, 26 cas unitaires et 42 tests E2E réussis après ces modifications. La mesure Lighthouse ci-dessus date du 4 octobre.

## Raffinement de la carte — 5 octobre

Fond Mapbox Light, tuiles haute définition, repère OA et étiquette « Le cabinet », boutons de zoom arrondis en français. Le même fond et le même filtre de couleur sont utilisés avant et après activation. Les tests utilisent un jeton factice et des tuiles simulées, et contrôlent explicitement le chemin Mapbox ainsi que l’alignement géographique des deux vues. Le jeton réel n’est ni lu ni copié : le build utilise `PUBLIC_MAPBOX_TOKEN` lorsqu’elle est configurée sur Netlify. Interface vérifiée à 320, 390, 1182 et 1456 px. Captures des contrôles sur fond neutre de test (sans géographie simulée) : [mobile](docs/screenshots/feedback/map-controls-mobile.png) et [desktop](docs/screenshots/feedback/map-controls-desktop.png). La présence et la validité de la clé sur Netlify ne sont pas vérifiées depuis cet environnement.

## Limites de vérification

La refonte est partagée via la Deploy Preview de la PR #26. Le lien Calendly a été vérifié sans créer de rendez-vous. Les réponses de soumission Netlify sont simulées dans les tests : aucun message réel n’a été envoyé. Le chargement des tuiles externes est simulé dans les tests de carte, le réseau de cet environnement ne permettant pas d’atteindre les fournisseurs de cartes. La transition, l’alignement des tuiles et du repère ainsi que le repli réseau sont vérifiés ; l’affichage des tuiles réelles dépend du service Mapbox et du jeton configuré sur Netlify (ou d’OpenStreetMap en repli). Le score Lighthouse décrit cette mesure locale et ne garantit pas les performances en production.

Aucun défaut P0, P1 ou P2 restant constaté dans le périmètre vérifié.
