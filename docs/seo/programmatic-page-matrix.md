# Matrice des pages SEO programmatiques

## Barème et gates

Chaque axe vaut de 0 à 3 : demande, adéquation commerciale, valeur propre et
mesure. Une approbation exige simultanément demande ≥ 2, adéquation ≥ 2, valeur
≥ 2, mesure ≥ 1, total ≥ 8 et aucun veto. Un veto suffit à rejeter le candidat,
même si son total atteint 8.

| Axe | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Demande | Aucune source | Une source datée | Deux sources convergentes | Demande et conversion observées |
| Adéquation commerciale | Service non offert | Modalité incertaine ou marginale | Service confirmé et réservable | Service cœur, capacité et tarif confirmés |
| Valeur propre | Rien au-delà de l'accueil | Un élément réellement propre | Deux éléments propres vérifiables | Au moins trois éléments, dont une preuve de première main |
| Mesure | Aucune conversion | CTA générique | Événement page-spécifique défini | Baseline et événement déjà vérifiés |

Vetos appliqués : cannibalisation non résolue, contenu interchangeable après
masquage du lieu ou de l'animal, offre ou claim non approuvé, absence de
relecture, donnée non maintenable, ou impossibilité de valider demande et
autorité avec des données propriétaires. Le responsable de contenu disponible
est Agathe Lescout, avec une revue annuelle prévue ; ce point ne compense pas
les autres vetos.

## Entrées disponibles et limite de valeur propre

| Candidat | Éléments factuels disponibles | Pourquoi ils ne suffisent pas à une page distincte aujourd'hui |
| --- | --- | --- |
| Chien | Tarifs par âge ; cabinet et domicile ; texte chien visible par défaut | Ces éléments sont déjà portés par l'accueil et aucune question ou preuve canine de première main n'est documentée |
| Chat | Tarifs par âge ; cabinet et domicile ; texte chat existant | Le service est confirmé, mais aucun volume, conversion ou corpus de questions réelles ne différencie encore une route |
| NAC | Définition fermée lapins, rongeurs et furets ; tarif propre ; deux modalités | Aucun signal Autocomplete et l'accueil est déjà visible sur l'intention ; les données ne justifient pas une route autonome |
| Bègles | Adresse du cabinet ; horaires ; stationnement, rocade et tram ; réservation cabinet | Le bloc cabinet de l'accueil contient déjà ces preuves locales ; une nouvelle page les dupliquerait |
| Bordeaux | Domicile dans la région bordelaise ; tarif de déplacement ; contact direct | Aucune zone communale ou modalité Bordeaux distincte n'est confirmée et la cible est celle de l'accueil |

## Décision uniforme

| Candidat | URL | Demande | Adéquation | Valeur | Mesure | Total | Veto | Décision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-001 | /animaux/chien/ | 1 | 3 | 1 | 1 | 6 | Accueil déjà centré sur le chien ; cannibalisation non résolue, aucun volume ou conversion propriétaire et backlinks comparables indisponibles | REJECT |
| CAND-002 | /animaux/chat/ | 1 | 3 | 2 | 1 | 7 | Aucun volume, baseline de conversion ou backlinks comparables ; la valeur pressentie n'est pas encore validée par des données de première main | REJECT |
| CAND-003 | /animaux/nac/ | 0 | 3 | 1 | 1 | 5 | Aucun signal de demande Autocomplete, accueil déjà classé, aucune baseline propriétaire et backlinks comparables indisponibles | REJECT |
| CAND-004 | /zones-intervention/begles/ | 1 | 3 | 3 | 1 | 8 | Duplication du cabinet détaillé sur l'accueil, cannibalisation non résolue et aucune séparation de demande ou conversion par page | REJECT |
| CAND-005 | /zones-intervention/bordeaux/ | 1 | 3 | 1 | 1 | 6 | Cible directe de l'accueil, aucune modalité propre à Bordeaux, aucune baseline propriétaire et backlinks comparables indisponibles | REJECT |

## Verdict

Zéro candidat satisfait les gates : le spike est `REJECTED` et aucun plan de
livraison ni route de production ne doit être créé. Ce rejet est daté, pas
définitif. Si des volumes, conversions et comparaisons d'autorité fiables sont
fournis, le chat est la première hypothèse à retester seul contre l'accueil ;
les cinq candidats devront néanmoins être rescorrés avec le même barème.
