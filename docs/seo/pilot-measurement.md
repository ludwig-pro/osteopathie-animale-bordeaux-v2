# Protocole de mesure d'un futur pilote SEO

## Statut et principe

Au 19 juillet 2026, zéro page est approuvée : ce protocole reste dormant. Il ne
déclenche ni création de route, ni indexation, ni soumission à un moteur. Une
future approbation mesurerait l'utilité d'une seule page pilote face à l'accueil
sans aucune promesse de ranking.

- **Propriétaire métier et contenu** : Agathe Lescout.
- **Responsable de la mesure** : mainteneur du site désigné au moment de
  l'approbation, avec accès agrégé à Search Console et à l'analytics.
- **Durée minimale** : de J0 à J+90.
- **Extension** : aucune nouvelle page avant la revue J+90 et la preuve de
  qualité, de valeur propre, de maintien des claims et de non-cannibalisation.

## Baseline J0

J0 est la date de mise en ligne vérifiée, jamais la date du commit. Avant toute
publication, enregistrer dans un agrégat sans donnée personnelle :

- URL, canonical, title, H1, statut HTTP, présence au sitemap et état
  d'indexation de la page pilote ;
- requêtes non-marque, impressions, clics, CTR et position de l'accueil sur les
  28 et 90 jours précédents, selon la période réellement disponible ;
- conversions primaires et micro-conversions de l'accueil sur les mêmes
  fenêtres ;
- date, zone, appareil, source et limites de chaque extraction ;
- version de la matrice, de la vérité métier et de la politique santé utilisées.

Sans baseline Search Console et conversion exploitable, la publication reste
bloquée. Les données brutes, tokens, requêtes nominatives et messages de contact
restent hors Git.

## Événements et attribution

| Niveau | Signal | Interprétation autorisée |
| --- | --- | --- |
| Primaire | `contact_form_submit_succeeded` avec `page_path` et `page_location` | Formulaire effectivement soumis depuis la page attribuée |
| Micro-conversion | Clic Calendly avec `page_path`, destination et horodatage agrégé | Intention de quitter vers Calendly, jamais preuve de réservation |
| Micro-conversion | Clic `tel:` avec `page_path` | Intention d'appel, jamais preuve d'appel abouti ni de consultation |
| Micro-conversion | Clic `mailto:` avec `page_path` | Intention d'e-mail, jamais preuve de message envoyé |
| Diagnostic | Vue HTML de la page, statut canonical et source d'acquisition | Contrôle de disponibilité et d'attribution, pas conversion métier |

Les comptes d'appels et de formulaires sont rapportés séparément. Aucun numéro,
adresse e-mail, contenu de message ou identifiant individuel ne doit être
collecté dans le document de suivi.

## Contrôles récurrents

| Revue | Contrôles obligatoires | Sortie attendue |
| --- | --- | --- |
| J+28 | Statut HTTP, canonical, sitemap, indexation, rendu sans JavaScript, requêtes non-marque, impressions, clics, formulaires, appels et micro-conversions ; comparaison de l'accueil sur la même fenêtre | Détecter défaut technique, absence de mesure ou cannibalisation précoce ; choisir `IMPROVE`, `NOINDEX` ou poursuivre |
| J+56 | Refaire J+28 ; comparer pages et requêtes entre pilote et accueil ; vérifier claims, offre, maillage, CTA et valeur propre | Corriger une faiblesse testable ou préparer `MERGE`, `NOINDEX` ou `REDIRECT` si la page n'est plus défendable |
| J+90 | Refaire tous les contrôles ; comparer J0, fenêtres 28/56/90 jours et saisonnalité disponible ; documenter conversions, non-marque, maintenance et cannibalisation | Décision finale `KEEP`, `IMPROVE`, `MERGE`, `NOINDEX` ou `REDIRECT` avec preuve datée |

Une variation de position seule ne suffit jamais à décider. La lecture combine
indexation, impressions non-marque, clics, appels, formulaires, qualité du
contenu, exactitude de l'offre et absence de déplacement nuisible des requêtes
de l'accueil.

## Règles de décision

- `KEEP` : page indexable, exacte, distincte et maintenable, avec signal
  non-marque utile et aucune cannibalisation nette non résolue. La conservation
  n'autorise pas automatiquement une extension.
- `IMPROVE` : hypothèse toujours valide mais faiblesse précise et testable dans
  contenu, CTA, maillage ou mesure ; documenter le changement et une nouvelle
  date de revue.
- `MERGE` : valeur utile mais insuffisamment distincte ; intégrer uniquement les
  éléments prouvés à l'accueil, puis retirer la route selon le rollback.
- `NOINDEX` : mesure, claim, offre ou qualité temporairement invalide ; retirer
  la page du sitemap et appliquer `noindex,follow` pendant la correction.
- `REDIRECT` : intention dupliquée, offre retirée ou route sans avenir propre ;
  rediriger en 301 vers la page canonique la plus proche après transfert des
  seuls éléments encore utiles.

## Rollback

Pour `MERGE` ou `REDIRECT`, capturer d'abord les agrégats finaux, mettre à jour
le maillage et le sitemap, transférer les informations valides, poser une 301
vers l'accueil ou la destination approuvée, puis tester le statut et le
canonical. Pour `NOINDEX`, conserver temporairement la route accessible mais
hors sitemap, vérifier la balise et fixer une date de réexamen ; une situation
non résolue à la revue suivante devient `MERGE` ou `REDIRECT`.

Le rollback doit également retirer les données structurées, liens entrants et
événements devenus orphelins. Il ne supprime aucun agrégat nécessaire à la
comparaison J0/J+90 et ne conserve aucune donnée personnelle.

## Gate d'expansion

Avant J+90, toute extension est interdite. Après J+90, elle reste interdite si
la page n'est pas exacte, distincte, maintenable et mesurable, si la
cannibalisation n'est pas résolue, ou si les données de demande et conversion
restent absentes. Une éventuelle extension exige une nouvelle matrice et un
brief complet par route ; le succès supposé d'une page ne se transpose pas à
une autre espèce ou ville.
