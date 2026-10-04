# Vérification de la refonte

Date : 4 octobre 2026.

final result: passed

## Direction vérifiée

Refonte professionnelle en vert forêt, sauge et crème, fondée sur les photos existantes. La V1 conserve ses sections, ses pages animaux et son échelle de textes agrandie. Le hero reprend la composition de la V2 : photo pleine largeur, fond vert profond, grand titre Lora, accent vert clair et bandeau inférieur.

## Rendu et navigation

Les cinq pages ont été ouvertes avec Chromium sur ordinateur et mobile. Le hero a aussi été contrôlé à 320, 390, 768, 1024, 1440 et 1576 px, avec ses liens vers les animaux et le contact. L’espacement du sous-titre de la marque est réduit sous 360 px pour que le menu reste dans l’écran. Les captures de l’accueil ont été actualisées sur le build de production, après chargement des polices et des images. Les états du menu, des tarifs et des étapes de consultation sont vérifiés par les tests.

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
- `yarn test:unit` : 2 tests réussis.
- `yarn test:e2e` : 37 tests réussis, avec Chromium système et une configuration locale adaptée à l’environnement.
- Menu mobile et navigation sans JavaScript : 2 tests revérifiés sur le build de production après l’ajustement à 320 px.
- Textes des quatre animaux : comparés intégralement aux textes d’origine après normalisation des espaces.
- Images : choix du plus petit format adéquat contrôlé à 375, 768, 1024, 1280 et 1440 px.
- Navigation : accès direct, rechargement, retour navigateur, liens entre pages, ancres depuis une autre page et menu mobile.
- Accessibilité fonctionnelle : focus du formulaire, Échap et retour du focus dans le menu, clavier sur les onglets, accordéons, liens d’évitement et un seul titre H1 par page.
- Consentement : refus, préférences, chargement conditionnel des services conservés.
- Carte : code et styles Mapbox chargés seulement après demande explicite.
- Lighthouse mobile, accueil avec le nouveau hero, mesure locale unique : performance 93, accessibilité 100, bonnes pratiques 100, SEO 100.

## Limites de vérification

La refonte est partagée via la Deploy Preview de la PR #26. Le lien Calendly a été vérifié sans créer de rendez-vous. Les réponses de soumission Netlify sont simulées dans les tests : aucun message réel n’a été envoyé. La carte dispose de son repli habituel en l’absence d’un jeton Mapbox. Le score Lighthouse décrit cette mesure locale et ne garantit pas les performances en production.

Aucun défaut P0, P1 ou P2 restant constaté dans le périmètre vérifié.
