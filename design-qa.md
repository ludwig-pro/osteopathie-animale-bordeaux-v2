# Vérification de la refonte

Date : 4 octobre 2026.

final result: passed

## Direction vérifiée

Refonte professionnelle en vert forêt, sauge et crème, fondée sur les photos existantes. Les illustrations explorées ont été retirées à la demande de l’utilisatrice. Le design est évalué par rapport à ce brief de refonte ; il ne cherche pas à reproduire la mise en page précédente.

## Rendu et navigation

Les cinq pages ont été ouvertes avec Chromium en 1440 × 1000 et 390 × 844. Les captures finales ont été réalisées sur le build de production, après chargement des polices et des images paresseuses. Aucun débordement horizontal ni erreur JavaScript n’a été observé. Les images et les textes ont été inspectés visuellement, avec les états desktop et mobile du menu, des tarifs et des étapes de consultation vérifiés par les tests.

Captures :

- [Accueil desktop](docs/screenshots/redesign/home-desktop.jpg)
- [Accueil mobile](docs/screenshots/redesign/home-mobile.jpg)
- [Page chien desktop](docs/screenshots/redesign/dog-desktop.jpg)
- [Page chien mobile](docs/screenshots/redesign/dog-mobile.jpg)

## Contrôles

- `yarn build` : réussi, quatre routes animales générées et accueil statique.
- `yarn check:static` : réussi ; aucun avertissement ni erreur de typage. Une suggestion préexistante de TypeScript concerne l’import CookieConsent.
- `yarn test:unit` : 2 tests réussis.
- `yarn test:e2e` : 37 tests réussis, avec Chromium système et une configuration locale adaptée à l’environnement.
- Textes des quatre animaux : comparés intégralement aux textes d’origine après normalisation des espaces.
- Images : choix du plus petit format adéquat contrôlé à 375, 768, 1024, 1280 et 1440 px.
- Navigation : accès direct, rechargement, retour navigateur, liens entre pages, ancres depuis une autre page et menu mobile.
- Accessibilité fonctionnelle : focus du formulaire, Échap et retour du focus dans le menu, clavier sur les onglets, accordéons, liens d’évitement et un seul titre H1 par page.
- Consentement : refus, préférences, chargement conditionnel des services conservés.
- Carte : code et styles Mapbox chargés seulement après demande explicite.
- Lighthouse mobile, accueil, mesure locale unique : performance 90, accessibilité 100, bonnes pratiques 100, SEO 100. Les textes secondaires et les numéros d’étapes ont été assombris à la suite du premier audit de contraste.

## Limites de vérification

Le site n’a pas été publié. Le lien Calendly a été vérifié sans créer de rendez-vous. Les réponses de soumission Netlify sont simulées dans les tests : aucun message réel n’a été envoyé. La carte dispose de son repli habituel en l’absence d’un jeton Mapbox. Le score Lighthouse décrit cette mesure locale et ne garantit pas les performances en production.

Aucun défaut P0, P1 ou P2 restant constaté dans le périmètre vérifié.
