# Vérification — version éditoriale animée

Date : 4 octobre 2026.

final result: passed

## Direction

Deuxième proposition distincte de la PR #26 : photographie pleine largeur, vert profond et vert lumineux, grands titres, galerie décalée, tarifs en lignes et angles droits. Photos et textes métier conservés ; les quatre pages animales partagent le même modèle.

## Vérification locale

- `yarn build` : réussi, six pages statiques dont la 404.
- `yarn check:static` : réussi, aucune erreur ni avertissement ; suggestion préexistante sur l’import CookieConsent.
- `yarn test:unit` : 2 tests réussis.
- `yarn test:e2e` : 38 tests réussis avec Chromium système, dont un contrôle de la préférence de réduction des animations et de son changement pendant la visite.
- Les cinq pages ont été contrôlées à 320, 390, 768, 1024, 1280 et 1440 px : aucun débordement horizontal ni erreur JavaScript ; texte courant à 18 px.
- Navigation desktop et mobile, clavier, formulaire, consentement, carte à la demande et navigation sans JavaScript vérifiés. Les soumissions sont simulées ; aucun message ni rendez-vous réel créé.
- Les textes des quatre animaux sont comparés intégralement aux contenus d’origine ; le choix des images responsive est contrôlé à cinq largeurs.
- Lighthouse mobile sur le build local de production : performance 89, accessibilité 100, bonnes pratiques 100, SEO 100. Une mesure ponctuelle ne garantit pas les scores sur l’hébergement.

## Captures

Captures après chargement des polices et images sur le build local de production :

- [Accueil desktop](docs/screenshots/editorial/home-desktop.png)
- [Accueil complet](docs/screenshots/editorial/home-full.jpg)
- [Accueil mobile](docs/screenshots/editorial/home-mobile.png)
- [Page chien desktop](docs/screenshots/editorial/dog-desktop.png)
- [Page chien mobile](docs/screenshots/editorial/dog-mobile.png)

## Hébergement

Cette branche est destinée à une Deploy Preview Netlify séparée. Aucune fusion dans `main` ni publication en production. L’accès HTTP aux domaines Netlify est restreint dans l’environnement de travail ; la disponibilité distante se vérifie via le statut de déploiement Netlify, les contrôles visuels et fonctionnels étant réalisés localement.
