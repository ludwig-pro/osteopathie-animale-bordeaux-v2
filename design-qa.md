# Vérification — V3

Date : 4 octobre 2026.

final result: passed

## Proposition

Direction indépendante centrée sur l’accompagnement du propriétaire : palette prune/abricot/ivoire, titres Manrope, photographie de soin, textes réécrits, FAQ et accès mobile au rendez-vous. L’identité, les qualifications, les coordonnées et les montants existants sont conservés. La V2 reste sur sa propre branche et dans la PR #27.

## Vérifications

- `yarn build` : réussi, accueil, quatre pages animales et 404 statiques.
- `yarn check:static` : réussi, aucune erreur ni avertissement. Suggestion TypeScript préexistante sur CookieConsent.
- `yarn test:unit` : 2 tests réussis.
- `yarn test:e2e` : 40 tests réussis avec Chromium système et la configuration locale adaptée. Le test du raccourci mobile est également relancé après sa correction de largeur.
- Navigation, formulaires, consentement, carte à la demande, images responsive et focus clavier vérifiés.
- FAQ contrôlée avec le clavier et sans JavaScript ; réduction des animations et changement de préférence contrôlés.
- Cinq pages vérifiées à 320, 390, 768, 1024, 1280 et 1440 px, sans débordement horizontal ni erreur JavaScript.
- Lighthouse mobile local : performance 91, accessibilité 100, bonnes pratiques 100, SEO 100. Mesure ponctuelle, sans garantie de score sur l’hébergement.

## Captures

- [Accueil desktop](docs/screenshots/v3/home-desktop.png)
- [Accueil complet](docs/screenshots/v3/home-full.jpg)
- [Accueil mobile](docs/screenshots/v3/home-mobile.png)
- [Raccourci mobile](docs/screenshots/v3/mobile-booking.png)
- [Page chien desktop](docs/screenshots/v3/dog-desktop.png)
- [Page chien mobile](docs/screenshots/v3/dog-mobile.png)

Les captures sont réalisées sur le build local, après chargement des polices et des images paresseuses. Le débordement du bouton flottant, détecté sur la capture mobile, a été corrigé et ajouté au contrôle automatisé.

## Portée

Les soumissions de formulaire sont simulées dans les tests : aucun message réel ni rendez-vous créé. La carte conserve son repli en l’absence de jeton. La publication vise une Deploy Preview Netlify distincte ; aucune fusion en production. La disponibilité distante est confirmée par le statut de déploiement, les domaines Netlify étant inaccessibles en HTTP depuis l’environnement local.
